import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { PrismaRepository } from "../prisma.service";
let OAuthRepository = class OAuthRepository {
    constructor(_oauthApp, _oauthAuth) {
        this._oauthApp = _oauthApp;
        this._oauthAuth = _oauthAuth;
    }
    getAppByOrgId(orgId) {
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
    getAppByClientId(clientId) {
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
    createApp(orgId, data) {
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
    updateApp(orgId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const app = yield this._oauthApp.model.oAuthApp.findFirst({
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
        });
    }
    deleteApp(orgId) {
        return __awaiter(this, void 0, void 0, function* () {
            const app = yield this._oauthApp.model.oAuthApp.findFirst({
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
        });
    }
    updateClientSecret(orgId, newSecret) {
        return __awaiter(this, void 0, void 0, function* () {
            const app = yield this._oauthApp.model.oAuthApp.findFirst({
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
        });
    }
    createAuthorization(data) {
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
            },
            update: {
                authorizationCode: data.authorizationCode,
                codeExpiresAt: data.codeExpiresAt,
                accessToken: null,
                revokedAt: null,
            },
        });
    }
    findByCode(encryptedCode) {
        return this._oauthAuth.model.oAuthAuthorization.findFirst({
            where: {
                authorizationCode: encryptedCode,
                revokedAt: null,
            },
        });
    }
    exchangeCodeForToken(id, encryptedToken) {
        return this._oauthAuth.model.oAuthAuthorization.update({
            where: { id },
            data: {
                accessToken: encryptedToken,
                authorizationCode: null,
                codeExpiresAt: null,
            },
        });
    }
    findByAccessToken(encryptedToken) {
        return this._oauthAuth.model.oAuthAuthorization.findFirst({
            where: {
                accessToken: encryptedToken,
                revokedAt: null,
            },
            include: {
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
                    select: { id: true },
                },
            },
        });
    }
    getApprovedApps(userId) {
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
    revokeAuthorization(userId, authId) {
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
    revokeAllForApp(oauthAppId) {
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
};
OAuthRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaRepository,
        PrismaRepository])
], OAuthRepository);
export { OAuthRepository };
//# sourceMappingURL=oauth.repository.js.map