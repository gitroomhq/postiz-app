import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OAuthRepository } from '@gitroom/nestjs-libraries/database/prisma/oauth/oauth.repository';
import { CreateOAuthAppDto } from '@gitroom/nestjs-libraries/dtos/oauth/create-oauth-app.dto';
import { UpdateOAuthAppDto } from '@gitroom/nestjs-libraries/dtos/oauth/update-oauth-app.dto';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { extractBearerToken } from '@gitroom/nestjs-libraries/chat/oauth-types';

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

  async validateAuthorizationRequest(clientId: string) {
    const app = await this._oauthRepository.getAppByClientId(clientId);
    if (!app) {
      throw new HttpException('Invalid client_id', HttpStatus.BAD_REQUEST);
    }
    return app;
  }

  async createAuthorizationCode(
    oauthAppId: string,
    userId: string,
    organizationId: string
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
    });

    return code;
  }

  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string
  ) {
    const app = await this._oauthRepository.getAppByClientId(clientId);
    if (!app) {
      throw new HttpException(
        { error: 'invalid_client' },
        HttpStatus.UNAUTHORIZED
      );
    }

    if (app.clientSecret !== AuthService.fixedEncryption(clientSecret)) {
      throw new HttpException(
        { error: 'invalid_client' },
        HttpStatus.UNAUTHORIZED
      );
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
