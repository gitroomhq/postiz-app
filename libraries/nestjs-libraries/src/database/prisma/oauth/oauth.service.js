import { __awaiter, __decorate, __metadata, __rest } from "tslib";
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OAuthRepository } from "./oauth.repository";
import { makeId } from "../../../services/make.is";
import { AuthService } from "../../../../../helpers/src/auth/auth.service";
let OAuthService = class OAuthService {
    constructor(_oauthRepository) {
        this._oauthRepository = _oauthRepository;
    }
    getApp(orgId) {
        return __awaiter(this, void 0, void 0, function* () {
            const app = yield this._oauthRepository.getAppByOrgId(orgId);
            if (!app)
                return false;
            const { clientSecret } = app, rest = __rest(app, ["clientSecret"]);
            return rest;
        });
    }
    createApp(orgId, dto) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = yield this._oauthRepository.getAppByOrgId(orgId);
            if (existing) {
                throw new HttpException('You can only have one OAuth application per organization', HttpStatus.BAD_REQUEST);
            }
            const clientId = 'pca_' + makeId(32);
            const clientSecret = 'pcs_' + makeId(48);
            const encryptedSecret = AuthService.fixedEncryption(clientSecret);
            const app = yield this._oauthRepository.createApp(orgId, {
                name: dto.name,
                description: dto.description,
                pictureId: dto.pictureId,
                redirectUrl: dto.redirectUrl,
                clientId,
                clientSecret: encryptedSecret,
            });
            return Object.assign(Object.assign({}, app), { clientSecret });
        });
    }
    updateApp(orgId, dto) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._oauthRepository.updateApp(orgId, Object.assign(Object.assign(Object.assign(Object.assign({}, (dto.name && { name: dto.name })), (dto.description !== undefined && { description: dto.description })), (dto.pictureId !== undefined && { pictureId: dto.pictureId })), (dto.redirectUrl && { redirectUrl: dto.redirectUrl })));
        });
    }
    deleteApp(orgId) {
        return __awaiter(this, void 0, void 0, function* () {
            const app = yield this._oauthRepository.getAppByOrgId(orgId);
            if (!app) {
                throw new HttpException('No OAuth app found', HttpStatus.NOT_FOUND);
            }
            yield this._oauthRepository.revokeAllForApp(app.id);
            yield this._oauthRepository.deleteApp(orgId);
            return { success: true };
        });
    }
    rotateSecret(orgId) {
        return __awaiter(this, void 0, void 0, function* () {
            const app = yield this._oauthRepository.getAppByOrgId(orgId);
            if (!app) {
                throw new HttpException('No OAuth app found', HttpStatus.NOT_FOUND);
            }
            const newSecret = 'pcs_' + makeId(48);
            const encrypted = AuthService.fixedEncryption(newSecret);
            yield this._oauthRepository.updateClientSecret(orgId, encrypted);
            return { clientSecret: newSecret };
        });
    }
    validateAuthorizationRequest(clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            const app = yield this._oauthRepository.getAppByClientId(clientId);
            if (!app) {
                throw new HttpException('Invalid client_id', HttpStatus.BAD_REQUEST);
            }
            return app;
        });
    }
    createAuthorizationCode(oauthAppId, userId, organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const code = makeId(32);
            const encryptedCode = AuthService.fixedEncryption(code);
            const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
            yield this._oauthRepository.createAuthorization({
                oauthAppId,
                userId,
                organizationId,
                authorizationCode: encryptedCode,
                codeExpiresAt,
            });
            return code;
        });
    }
    exchangeCodeForToken(code, clientId, clientSecret) {
        return __awaiter(this, void 0, void 0, function* () {
            const app = yield this._oauthRepository.getAppByClientId(clientId);
            if (!app) {
                throw new HttpException({ error: 'invalid_client' }, HttpStatus.UNAUTHORIZED);
            }
            if (app.clientSecret !== AuthService.fixedEncryption(clientSecret)) {
                throw new HttpException({ error: 'invalid_client' }, HttpStatus.UNAUTHORIZED);
            }
            const encryptedCode = AuthService.fixedEncryption(code);
            const auth = yield this._oauthRepository.findByCode(encryptedCode);
            if (!auth || auth.oauthAppId !== app.id) {
                throw new HttpException({ error: 'invalid_grant' }, HttpStatus.BAD_REQUEST);
            }
            if (!auth.codeExpiresAt || new Date() > auth.codeExpiresAt) {
                throw new HttpException({ error: 'invalid_grant', error_description: 'Code has expired' }, HttpStatus.BAD_REQUEST);
            }
            const token = 'pos_' + makeId(40);
            const encryptedToken = AuthService.fixedEncryption(token);
            const { organizationId } = yield this._oauthRepository.exchangeCodeForToken(auth.id, encryptedToken);
            return {
                id: organizationId,
                access_token: token,
                token_type: 'bearer',
            };
        });
    }
    getOrgByOAuthToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const encrypted = AuthService.fixedEncryption(token);
            return this._oauthRepository.findByAccessToken(encrypted);
        });
    }
    getApprovedApps(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._oauthRepository.getApprovedApps(userId);
        });
    }
    revokeApp(userId, authId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._oauthRepository.revokeAuthorization(userId, authId);
            return { success: true };
        });
    }
};
OAuthService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [OAuthRepository])
], OAuthService);
export { OAuthService };
//# sourceMappingURL=oauth.service.js.map