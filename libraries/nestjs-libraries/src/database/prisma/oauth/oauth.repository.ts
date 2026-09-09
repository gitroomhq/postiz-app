import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class OAuthRepository {
  constructor(
    private _oauthApp: PrismaRepository<'oAuthApp'>,
    private _oauthAuth: PrismaRepository<'oAuthAuthorization'>
  ) {}

  getAppByOrgId(orgId: string) {
    return this._oauthApp.model.oAuthApp.findFirst({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        picture: true,
      },
    });
  }

  getAppByClientId(clientId: string) {
    return this._oauthApp.model.oAuthApp.findFirst({
      where: {
        clientId,
        deletedAt: null,
      },
      include: {
        picture: true,
      },
    });
  }

  createApp(
    orgId: string,
    data: {
      name: string;
      description?: string;
      pictureId?: string;
      redirectUrl: string;
      clientId: string;
      clientSecret: string;
    }
  ) {
    return this._oauthApp.model.oAuthApp.create({
      data: {
        organizationId: orgId,
        name: data.name,
        description: data.description,
        pictureId: data.pictureId,
        redirectUrl: data.redirectUrl,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
      },
      include: {
        picture: true,
      },
    });
  }

  createDynamicApp(data: {
    name: string;
    redirectUrl: string;
    redirectUris: string;
    clientId: string;
    clientSecret?: string;
    tokenEndpointAuthMethod: string;
  }) {
    return this._oauthApp.model.oAuthApp.create({
      data: {
        name: data.name,
        redirectUrl: data.redirectUrl,
        redirectUris: data.redirectUris,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        tokenEndpointAuthMethod: data.tokenEndpointAuthMethod,
        dynamic: true,
      },
    });
  }

  // Dynamic clients register before the consent screen, so abandoned flows
  // leave orphan rows; prune the ones no user ever authorized
  deleteStaleDynamicApps(olderThan: Date) {
    return this._oauthApp.model.oAuthApp.deleteMany({
      where: {
        dynamic: true,
        createdAt: { lt: olderThan },
        authorizations: { none: {} },
      },
    });
  }

  async updateApp(
    orgId: string,
    data: {
      name?: string;
      description?: string;
      pictureId?: string;
      redirectUrl?: string;
    }
  ) {
    const app = await this._oauthApp.model.oAuthApp.findFirst({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
    });
    if (!app) {
      return null;
    }
    return this._oauthApp.model.oAuthApp.update({
      where: { id: app.id },
      data,
      include: {
        picture: true,
      },
    });
  }

  async deleteApp(orgId: string) {
    const app = await this._oauthApp.model.oAuthApp.findFirst({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
    });
    if (!app) {
      return null;
    }
    return this._oauthApp.model.oAuthApp.update({
      where: { id: app.id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async updateClientSecret(orgId: string, newSecret: string) {
    const app = await this._oauthApp.model.oAuthApp.findFirst({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
    });
    if (!app) {
      return null;
    }
    return this._oauthApp.model.oAuthApp.update({
      where: { id: app.id },
      data: {
        clientSecret: newSecret,
      },
    });
  }

  createAuthorization(data: {
    oauthAppId: string;
    userId: string;
    organizationId: string;
    authorizationCode: string;
    codeExpiresAt: Date;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    redirectUri?: string;
  }) {
    return this._oauthAuth.model.oAuthAuthorization.upsert({
      where: {
        oauthAppId_userId_organizationId: {
          oauthAppId: data.oauthAppId,
          userId: data.userId,
          organizationId: data.organizationId,
        },
      },
      create: {
        oauthAppId: data.oauthAppId,
        userId: data.userId,
        organizationId: data.organizationId,
        authorizationCode: data.authorizationCode,
        codeExpiresAt: data.codeExpiresAt,
        codeChallenge: data.codeChallenge || null,
        codeChallengeMethod: data.codeChallengeMethod || null,
        redirectUri: data.redirectUri || null,
      },
      update: {
        authorizationCode: data.authorizationCode,
        codeExpiresAt: data.codeExpiresAt,
        codeChallenge: data.codeChallenge || null,
        codeChallengeMethod: data.codeChallengeMethod || null,
        redirectUri: data.redirectUri || null,
        accessToken: null,
        revokedAt: null,
      },
    });
  }

  findByCode(encryptedCode: string) {
    return this._oauthAuth.model.oAuthAuthorization.findFirst({
      where: {
        authorizationCode: encryptedCode,
        revokedAt: null,
      },
    });
  }

  exchangeCodeForToken(id: string, encryptedToken: string) {
    return this._oauthAuth.model.oAuthAuthorization.update({
      where: { id },
      select: {
        organizationId: true,
        organization: {
          select: {
            paymentId: true,
          }
        }
      },
      data: {
        accessToken: encryptedToken,
        authorizationCode: null,
        codeExpiresAt: null,
        codeChallenge: null,
        codeChallengeMethod: null,
        redirectUri: null,
      },
    });
  }

  findByAccessToken(encryptedToken: string) {
    return this._oauthAuth.model.oAuthAuthorization.findFirst({
      where: {
        accessToken: encryptedToken,
        revokedAt: null,
      },
      include: {
        oauthApp: {
          select: {
            clientId: true,
          },
        },
        organization: {
          include: {
            subscription: {
              select: {
                subscriptionTier: true,
                totalChannels: true,
                isLifetime: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            activated: true,
          },
        },
      },
    });
  }

  getApprovedApps(userId: string) {
    return this._oauthAuth.model.oAuthAuthorization.findMany({
      where: {
        userId,
        revokedAt: null,
        accessToken: { not: null },
      },
      include: {
        oauthApp: {
          include: {
            picture: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  revokeAuthorization(userId: string, authId: string) {
    return this._oauthAuth.model.oAuthAuthorization.update({
      where: {
        id: authId,
        userId,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  revokeAllForApp(oauthAppId: string) {
    return this._oauthAuth.model.oAuthAuthorization.updateMany({
      where: {
        oauthAppId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
