/**
 * OAuth Middleware for MCP Server
 *
 * Implements OAuth 2.0 Protected Resource support per RFC 9728 for MCP servers.
 * Based on Mastra's implementation at commit 27c37ca.
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
 * @see https://www.rfc-editor.org/rfc/rfc9728.html
 */

import type * as http from 'node:http';

import type { MCPServerOAuthConfig, TokenValidationResult } from './oauth-types';
import {
  generateProtectedResourceMetadata,
  generateWWWAuthenticateHeader,
  extractBearerToken,
} from './oauth-types';

interface OAuthMiddlewareLogger {
  debug?: (message: string, ...args: unknown[]) => void;
}

export interface OAuthMiddlewareOptions {
  oauth: MCPServerOAuthConfig;
  mcpPath?: string;
  logger?: OAuthMiddlewareLogger;
}

export interface OAuthMiddlewareResult {
  proceed: boolean;
  handled: boolean;
  tokenValidation?: TokenValidationResult;
}

export function createOAuthMiddleware(options: OAuthMiddlewareOptions) {
  const { oauth, mcpPath = '/mcp', logger } = options;

  const protectedResourceMetadata = generateProtectedResourceMetadata(oauth);
  const wellKnownPath = '/.well-known/oauth-protected-resource';
  const resourceMetadataUrl = new URL(wellKnownPath, oauth.resource).toString();

  return async function oauthMiddleware(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    url: URL,
  ): Promise<OAuthMiddlewareResult> {
    logger?.debug?.(`OAuth middleware: ${req.method} ${url.pathname}`);

    // Handle Protected Resource Metadata endpoint (RFC 9728)
    if (url.pathname === wellKnownPath && req.method === 'GET') {
      logger?.debug?.('OAuth middleware: Serving Protected Resource Metadata');
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=3600',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(protectedResourceMetadata));
      return { proceed: false, handled: true };
    }

    // Handle CORS preflight for metadata endpoint
    if (url.pathname === wellKnownPath && req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      });
      res.end();
      return { proceed: false, handled: true };
    }

    // Only protect the MCP endpoint
    if (!url.pathname.startsWith(mcpPath)) {
      return { proceed: true, handled: false };
    }

    // Extract and validate bearer token
    const authHeader = req.headers['authorization'];
    const token = extractBearerToken(authHeader as string | undefined);

    if (!token) {
      logger?.debug?.('OAuth middleware: No bearer token provided');
      res.writeHead(401, {
        'Content-Type': 'application/json',
        'WWW-Authenticate': generateWWWAuthenticateHeader({ resourceMetadataUrl }),
      });
      res.end(
        JSON.stringify({
          error: 'unauthorized',
          error_description: 'Bearer token required',
        }),
      );
      return { proceed: false, handled: true };
    }

    // Validate the token
    if (oauth.validateToken) {
      logger?.debug?.('OAuth middleware: Validating token');
      const validationResult = await oauth.validateToken(token, oauth.resource);

      if (!validationResult.valid) {
        logger?.debug?.(`OAuth middleware: Token validation failed: ${validationResult.error}`);
        res.writeHead(401, {
          'Content-Type': 'application/json',
          'WWW-Authenticate': generateWWWAuthenticateHeader({
            resourceMetadataUrl,
            additionalParams: {
              error: validationResult.error || 'invalid_token',
              ...(validationResult.errorDescription && {
                error_description: validationResult.errorDescription,
              }),
            },
          }),
        });
        res.end(
          JSON.stringify({
            error: validationResult.error || 'invalid_token',
            error_description: validationResult.errorDescription || 'Token validation failed',
          }),
        );
        return { proceed: false, handled: true, tokenValidation: validationResult };
      }

      logger?.debug?.('OAuth middleware: Token validated successfully');
      return { proceed: true, handled: false, tokenValidation: validationResult };
    }

    // If no validateToken function provided, accept the token
    logger?.debug?.('OAuth middleware: No token validation configured, accepting token');
    return {
      proceed: true,
      handled: false,
      tokenValidation: { valid: true },
    };
  };
}

export function createStaticTokenValidator(validTokens: string[]): MCPServerOAuthConfig['validateToken'] {
  const tokenSet = new Set(validTokens);
  return async (token: string): Promise<TokenValidationResult> => {
    if (tokenSet.has(token)) {
      return { valid: true, scopes: ['mcp:read', 'mcp:write'] };
    }
    return {
      valid: false,
      error: 'invalid_token',
      errorDescription: 'Token not recognized',
    };
  };
}

interface IntrospectionResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string | string[];
  iss?: string;
  jti?: string;
  [key: string]: unknown;
}

export function createIntrospectionValidator(
  introspectionEndpoint: string,
  clientCredentials?: { clientId: string; clientSecret: string },
): MCPServerOAuthConfig['validateToken'] {
  return async (token: string, resource: string): Promise<TokenValidationResult> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      if (clientCredentials) {
        if (clientCredentials.clientId.includes(':')) {
          return {
            valid: false,
            error: 'invalid_request',
            errorDescription: 'clientId cannot contain a colon character per RFC 7617',
          };
        }
        const credentials = Buffer.from(`${clientCredentials.clientId}:${clientCredentials.clientSecret}`).toString(
          'base64',
        );
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const response = await fetch(introspectionEndpoint, {
        method: 'POST',
        headers,
        body: new URLSearchParams({
          token,
          token_type_hint: 'access_token',
        }),
      });

      if (!response.ok) {
        return {
          valid: false,
          error: 'server_error',
          errorDescription: `Introspection failed: ${response.status}`,
        };
      }

      const data = (await response.json()) as IntrospectionResponse;

      if (!data.active) {
        return {
          valid: false,
          error: 'invalid_token',
          errorDescription: 'Token is not active',
        };
      }

      if (data.aud) {
        const audiences = Array.isArray(data.aud) ? data.aud : [data.aud];
        if (!audiences.includes(resource)) {
          return {
            valid: false,
            error: 'invalid_token',
            errorDescription: 'Token audience does not match this resource',
          };
        }
      }

      return {
        valid: true,
        scopes:
          data.scope
            ?.trim()
            .split(' ')
            .filter(s => s !== '') || [],
        subject: data.sub,
        expiresAt: data.exp,
        claims: data as Record<string, unknown>,
      };
    } catch (error) {
      return {
        valid: false,
        error: 'server_error',
        errorDescription: error instanceof Error ? error.message : 'Introspection failed',
      };
    }
  };
}