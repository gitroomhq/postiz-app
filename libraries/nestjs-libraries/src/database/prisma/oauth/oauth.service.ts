import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OAuthRepository } from '@gitroom/nestjs-libraries/database/prisma/oauth/oauth.repository';
import { CreateOAuthAppDto } from '@gitroom/nestjs-libraries/dtos/oauth/create-oauth-app.dto';
import { UpdateOAuthAppDto } from '@gitroom/nestjs-libraries/dtos/oauth/update-oauth-app.dto';
import { RegisterClientDto } from '@gitroom/nestjs-libraries/dtos/oauth/register-client.dto';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { extractBearerToken } from '@gitroom/nestjs-libraries/chat/oauth-types';
import { createHash } from 'crypto';

const openAiOAuthClientId = () =>
  process.env.OPENAI_OAUTH_CLIENT_ID?.trim();

const enableOidcEmailClaims = () => Boolean(openAiOAuthClientId());

const oauthScope = (clientId: string) =>
  [
    ...(clientId === openAiOAuthClientId() ? ['openid', 'email'] : []),
    'mcp:read',
    'mcp:write',
  ].join(' ');

@Injectable()
export class OAuthService {
  constructor(private _oauthRepository: OAuthRepository) {}

  async getApp(orgId: string) {
    const app = await this._oauthRepository.getAppByOrgId(orgId);
    if (!app) return false;
    const { clientSecret, ...rest } = app;
    return rest;
  }

  async createApp(orgId: string, dto: CreateOAuthAppDto) {
    const existing = await this._oauthRepository.getAppByOrgId(orgId);
    if (existing) {
      throw new HttpException(
        'You can only have one OAuth application per organization',
        HttpStatus.BAD_REQUEST
      );
    }

    const clientId = 'pca_' + makeId(32);
    const clientSecret = 'pcs_' + makeId(48);
    const encryptedSecret = AuthService.fixedEncryption(clientSecret);

    const app = await this._oauthRepository.createApp(orgId, {
      name: dto.name,
      description: dto.description,
      pictureId: dto.pictureId,
      redirectUrl: dto.redirectUrl,
      clientId,
      clientSecret: encryptedSecret,
    });

    return { ...app, clientSecret };
  }

  async updateApp(orgId: string, dto: UpdateOAuthAppDto) {
    return this._oauthRepository.updateApp(orgId, {
      ...(dto.name && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.pictureId !== undefined && { pictureId: dto.pictureId }),
      ...(dto.redirectUrl && { redirectUrl: dto.redirectUrl }),
    });
  }

  async deleteApp(orgId: string) {
    const app = await this._oauthRepository.getAppByOrgId(orgId);
    if (!app) {
      throw new HttpException('No OAuth app found', HttpStatus.NOT_FOUND);
    }
    await this._oauthRepository.revokeAllForApp(app.id);
    await this._oauthRepository.deleteApp(orgId);
    return { success: true };
  }

  async rotateSecret(orgId: string) {
    const app = await this._oauthRepository.getAppByOrgId(orgId);
    if (!app) {
      throw new HttpException('No OAuth app found', HttpStatus.NOT_FOUND);
    }

    const newSecret = 'pcs_' + makeId(48);
    const encrypted = AuthService.fixedEncryption(newSecret);
    await this._oauthRepository.updateClientSecret(orgId, encrypted);
    return { clientSecret: newSecret };
  }

  // Domains allowed to receive DCR redirect_uris, from the
  // DCR_VERIFIED_DOMAINS env (comma separated). An empty list
  // means open registration (self-hosted default)
  private verifiedDomainList() {
    return (process.env.DCR_VERIFIED_DOMAINS || '')
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);
  }

  async registerDynamicClient(dto: RegisterClientDto) {
    const redirectUris = dto.redirect_uris.map((uri) => uri.trim());
    for (const uri of redirectUris) {
      let parsed: URL;
      try {
        parsed = new URL(uri);
      } catch {
        throw new HttpException(
          { error: 'invalid_redirect_uri', error_description: `Invalid redirect_uri: ${uri}` },
          HttpStatus.BAD_REQUEST
        );
      }
      const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
      if (parsed.protocol !== 'https:' && !isLoopback) {
        throw new HttpException(
          { error: 'invalid_redirect_uri', error_description: 'redirect_uris must use https (http is allowed for loopback only)' },
          HttpStatus.BAD_REQUEST
        );
      }
    }

    const verifiedDomains = this.verifiedDomainList();
    if (verifiedDomains.length) {
      for (const uri of redirectUris) {
        const host = new URL(uri).hostname.toLowerCase();
        const isVerified = verifiedDomains.some(
          (domain) => host === domain || host.endsWith('.' + domain)
        );
        if (!isVerified) {
          throw new HttpException(
            {
              error: 'invalid_redirect_uri',
              error_description: `redirect_uri host "${host}" is not a verified domain`,
            },
            HttpStatus.BAD_REQUEST
          );
        }
      }
    }

    if (dto.grant_types?.length && !dto.grant_types.includes('authorization_code')) {
      throw new HttpException(
        { error: 'invalid_client_metadata', error_description: 'Only the authorization_code grant type is supported' },
        HttpStatus.BAD_REQUEST
      );
    }

    // Registration happens before consent, so abandoned flows leave orphan
    // clients behind; opportunistically prune the ones nobody ever authorized
    this._oauthRepository
      .deleteStaleDynamicApps(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .catch(() => {});

    const isPublicClient = dto.token_endpoint_auth_method === 'none';
    const clientId = 'pcd_' + makeId(32);
    const clientSecret = isPublicClient ? undefined : 'pcs_' + makeId(48);

    const app = await this._oauthRepository.createDynamicApp({
      name: dto.client_name?.trim().slice(0, 100) || 'MCP Client',
      redirectUrl: redirectUris[0],
      redirectUris: JSON.stringify(redirectUris),
      clientId,
      clientSecret: clientSecret && AuthService.fixedEncryption(clientSecret),
      tokenEndpointAuthMethod: isPublicClient ? 'none' : 'client_secret_post',
    });

    return {
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret, client_secret_expires_at: 0 } : {}),
      client_id_issued_at: Math.floor(app.createdAt.getTime() / 1000),
      client_name: app.name,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: isPublicClient ? 'none' : 'client_secret_post',
      grant_types: ['authorization_code'],
      response_types: ['code'],
      scope: 'mcp:read mcp:write',
    };
  }

  async validateAuthorizationRequest(
    clientId: string,
    options?: {
      redirectUri?: string;
      codeChallenge?: string;
      codeChallengeMethod?: string;
    }
  ) {
    const app = await this._oauthRepository.getAppByClientId(clientId);
    if (!app) {
      throw new HttpException('Invalid client_id', HttpStatus.BAD_REQUEST);
    }

    // Dynamically registered clients must use their registered redirect_uris
    // and PKCE; statically registered apps keep the existing lenient flow
    if (app.dynamic) {
      const registered: string[] = JSON.parse(app.redirectUris || '[]');
      if (!options?.redirectUri || !registered.includes(options.redirectUri)) {
        throw new HttpException('Invalid redirect_uri', HttpStatus.BAD_REQUEST);
      }
      if (app.tokenEndpointAuthMethod === 'none' && !options?.codeChallenge) {
        throw new HttpException(
          'code_challenge is required for this client',
          HttpStatus.BAD_REQUEST
        );
      }
      if (
        options?.codeChallenge &&
        options?.codeChallengeMethod &&
        options.codeChallengeMethod !== 'S256'
      ) {
        throw new HttpException(
          'Only the S256 code_challenge_method is supported',
          HttpStatus.BAD_REQUEST
        );
      }
    }

    return app;
  }

  async createAuthorizationCode(
    oauthAppId: string,
    userId: string,
    organizationId: string,
    pkce?: {
      codeChallenge?: string;
      codeChallengeMethod?: string;
      redirectUri?: string;
    }
  ) {
    const code = makeId(32);
    const encryptedCode = AuthService.fixedEncryption(code);
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this._oauthRepository.createAuthorization({
      oauthAppId,
      userId,
      organizationId,
      authorizationCode: encryptedCode,
      codeExpiresAt,
      codeChallenge: pkce?.codeChallenge,
      codeChallengeMethod: pkce?.codeChallengeMethod,
      redirectUri: pkce?.redirectUri,
    });

    return code;
  }

  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret?: string,
    codeVerifier?: string,
    redirectUri?: string
  ) {
    const app = await this._oauthRepository.getAppByClientId(clientId);
    if (!app) {
      throw new HttpException(
        { error: 'invalid_client' },
        HttpStatus.UNAUTHORIZED
      );
    }

    // Public clients (dynamic registration with token_endpoint_auth_method=none)
    // authenticate with PKCE instead of a client secret
    const isPublicClient = app.dynamic && app.tokenEndpointAuthMethod === 'none';
    if (!isPublicClient) {
      if (
        !clientSecret ||
        !app.clientSecret ||
        app.clientSecret !== AuthService.fixedEncryption(clientSecret)
      ) {
        throw new HttpException(
          { error: 'invalid_client' },
          HttpStatus.UNAUTHORIZED
        );
      }
    }

    const encryptedCode = AuthService.fixedEncryption(code);
    const auth = await this._oauthRepository.findByCode(encryptedCode);
    if (!auth || auth.oauthAppId !== app.id) {
      throw new HttpException(
        { error: 'invalid_grant' },
        HttpStatus.BAD_REQUEST
      );
    }

    if (!auth.codeExpiresAt || new Date() > auth.codeExpiresAt) {
      throw new HttpException(
        { error: 'invalid_grant', error_description: 'Code has expired' },
        HttpStatus.BAD_REQUEST
      );
    }

    if (auth.codeChallenge) {
      if (!codeVerifier) {
        throw new HttpException(
          { error: 'invalid_grant', error_description: 'code_verifier is required' },
          HttpStatus.BAD_REQUEST
        );
      }
      const hashed = createHash('sha256').update(codeVerifier).digest('base64url');
      if (hashed !== auth.codeChallenge) {
        throw new HttpException(
          { error: 'invalid_grant', error_description: 'Invalid code_verifier' },
          HttpStatus.BAD_REQUEST
        );
      }
    }

    if (auth.redirectUri && redirectUri !== auth.redirectUri) {
      throw new HttpException(
        { error: 'invalid_grant', error_description: 'redirect_uri does not match the authorization request' },
        HttpStatus.BAD_REQUEST
      );
    }

    const token = 'pos_' + makeId(40);
    const encryptedToken = AuthService.fixedEncryption(token);
    const {
      organizationId,
      organization: { paymentId },
    } = await this._oauthRepository.exchangeCodeForToken(
      auth.id,
      encryptedToken
    );

    return {
      id: organizationId,
      cus: paymentId,
      access_token: token,
      token_type: 'bearer',
      scope: oauthScope(clientId),
    };
  }

  async getOrgByOAuthToken(token: string) {
    const encrypted = AuthService.fixedEncryption(token);
    return this._oauthRepository.findByAccessToken(encrypted);
  }

  async getUserInfo(authorization?: string) {
    if (!enableOidcEmailClaims()) {
      throw new HttpException(
        {
          error: 'not_found',
          error_description: 'OIDC email claims are not enabled',
        },
        HttpStatus.NOT_FOUND
      );
    }

    const token = extractBearerToken(authorization);
    if (!token) {
      throw new HttpException(
        { error: 'invalid_token', error_description: 'Bearer token required' },
        HttpStatus.UNAUTHORIZED
      );
    }

    const authorizationRecord = await this.getOrgByOAuthToken(token);
    if (!authorizationRecord) {
      throw new HttpException(
        { error: 'invalid_token', error_description: 'Token is invalid or revoked' },
        HttpStatus.UNAUTHORIZED
      );
    }

    if (authorizationRecord.oauthApp.clientId !== openAiOAuthClientId()) {
      throw new HttpException(
        {
          error: 'insufficient_scope',
          error_description:
            'This OAuth client is not authorized to access email claims',
        },
        HttpStatus.FORBIDDEN
      );
    }

    const { user } = authorizationRecord;
    return {
      sub: user.id,
      email: user.email,
      email_verified: user.activated,
    };
  }

  async getApprovedApps(userId: string) {
    return this._oauthRepository.getApprovedApps(userId);
  }

  async revokeApp(userId: string, authId: string) {
    await this._oauthRepository.revokeAuthorization(userId, authId);
    return { success: true };
  }
}
