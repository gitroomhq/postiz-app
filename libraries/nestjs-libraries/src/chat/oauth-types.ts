/**
 * OAuth Types for MCP Authentication
 *
 * Standalone types and helpers for OAuth-protected MCP servers.
 * Based on Mastra's implementation at commit 27c37ca.
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
 * @see https://www.rfc-editor.org/rfc/rfc9728.html
 */

import type * as http from 'node:http';

/**
 * Configuration for OAuth-protected MCP server.
 */
export interface MCPServerOAuthConfig {
  resource: string;
  authorizationServers: string[];
  scopesSupported?: string[];
  resourceName?: string;
  resourceDocumentation?: string;
  validateToken?: (token: string, resource: string) => Promise<TokenValidationResult>;
}

/**
 * Result of token validation.
 */
export interface TokenValidationResult {
  valid: boolean;
  error?: string;
  errorDescription?: string;
  scopes?: string[];
  subject?: string;
  expiresAt?: number;
  claims?: Record<string, unknown>;
}

/**
 * Options for OAuth-related HTTP responses.
 */
export interface OAuthResponseOptions {
  resourceMetadataUrl?: string;
  additionalParams?: Record<string, string>;
}

/**
 * Protected Resource Metadata per RFC 9728.
 */
export interface OAuthProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported?: string[];
  bearer_methods_supported?: string[];
  resource_name?: string;
  resource_documentation?: string;
}

function escapeHeaderValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function generateWWWAuthenticateHeader(options: OAuthResponseOptions = {}): string {
  const params: string[] = [];

  if (options.resourceMetadataUrl) {
    params.push(`resource_metadata="${escapeHeaderValue(options.resourceMetadataUrl)}"`);
  }

  if (options.additionalParams) {
    for (const [key, value] of Object.entries(options.additionalParams)) {
      params.push(`${key}="${escapeHeaderValue(value)}"`);
    }
  }

  if (params.length === 0) {
    return 'Bearer';
  }

  return `Bearer ${params.join(', ')}`;
}

export function generateProtectedResourceMetadata(config: MCPServerOAuthConfig): OAuthProtectedResourceMetadata {
  return {
    resource: config.resource,
    authorization_servers: config.authorizationServers,
    scopes_supported: config.scopesSupported ?? ['mcp:read', 'mcp:write'],
    bearer_methods_supported: ['header'],
    ...(config.resourceName && { resource_name: config.resourceName }),
    ...(config.resourceDocumentation && {
      resource_documentation: config.resourceDocumentation,
    }),
  };
}

export function extractBearerToken(authHeader: string | null | undefined): string | undefined {
  if (!authHeader) return undefined;

  const prefix = 'bearer ';
  if (authHeader.length <= prefix.length) return undefined;
  if (authHeader.slice(0, prefix.length).toLowerCase() !== prefix) return undefined;

  const token = authHeader.slice(prefix.length).trim();
  return token || undefined;
}