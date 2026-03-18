import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OAuthService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/oauth/oauth.service";
import { GetUserFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/user.from.request";
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { AuthorizeOAuthQueryDto, ApproveOAuthDto } from "../../../../../libraries/nestjs-libraries/src/dtos/oauth/authorize-oauth.dto";
import { TokenExchangeDto } from "../../../../../libraries/nestjs-libraries/src/dtos/oauth/token-exchange.dto";
let OAuthController = class OAuthController {
    constructor(_oauthService) {
        this._oauthService = _oauthService;
    }
    authorize(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const app = yield this._oauthService.validateAuthorizationRequest(query.client_id);
            return {
                app: {
                    name: app.name,
                    description: app.description,
                    picture: app.picture,
                    clientId: app.clientId,
                    redirectUrl: app.redirectUrl,
                },
                state: query.state,
            };
        });
    }
    token(body) {
        return __awaiter(this, void 0, void 0, function* () {
            if (body.grant_type !== 'authorization_code') {
                throw new HttpException({ error: 'unsupported_grant_type' }, HttpStatus.BAD_REQUEST);
            }
            return this._oauthService.exchangeCodeForToken(body.code, body.client_id, body.client_secret);
        });
    }
};
__decorate([
    Get('/authorize'),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AuthorizeOAuthQueryDto]),
    __metadata("design:returntype", Promise)
], OAuthController.prototype, "authorize", null);
__decorate([
    Post('/token'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [TokenExchangeDto]),
    __metadata("design:returntype", Promise)
], OAuthController.prototype, "token", null);
OAuthController = __decorate([
    ApiTags('OAuth'),
    Controller('/oauth'),
    __metadata("design:paramtypes", [OAuthService])
], OAuthController);
export { OAuthController };
let OAuthAuthorizedController = class OAuthAuthorizedController {
    constructor(_oauthService) {
        this._oauthService = _oauthService;
    }
    approveOrDeny(body, user, org) {
        return __awaiter(this, void 0, void 0, function* () {
            const app = yield this._oauthService.validateAuthorizationRequest(body.client_id);
            if (body.action === 'deny') {
                const redirectUrl = new URL(app.redirectUrl);
                redirectUrl.searchParams.set('error', 'access_denied');
                if (body.state) {
                    redirectUrl.searchParams.set('state', body.state);
                }
                return { redirect: redirectUrl.toString() };
            }
            const code = yield this._oauthService.createAuthorizationCode(app.id, user.id, org.id);
            const redirectUrl = new URL(app.redirectUrl);
            redirectUrl.searchParams.set('code', code);
            if (body.state) {
                redirectUrl.searchParams.set('state', body.state);
            }
            return { redirect: redirectUrl.toString() };
        });
    }
};
__decorate([
    Post('/authorize'),
    __param(0, Body()),
    __param(1, GetUserFromRequest()),
    __param(2, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ApproveOAuthDto, Object, Object]),
    __metadata("design:returntype", Promise)
], OAuthAuthorizedController.prototype, "approveOrDeny", null);
OAuthAuthorizedController = __decorate([
    ApiTags('OAuth'),
    Controller('/oauth'),
    __metadata("design:paramtypes", [OAuthService])
], OAuthAuthorizedController);
export { OAuthAuthorizedController };
//# sourceMappingURL=oauth.controller.js.map