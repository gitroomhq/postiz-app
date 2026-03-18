import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Delete, Get, Post, Put } from '@nestjs/common';
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { ApiTags } from '@nestjs/swagger';
import { OAuthService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/oauth/oauth.service";
import { CheckPolicies } from "../../services/auth/permissions/permissions.ability";
import { AuthorizationActions, Sections, } from "../../services/auth/permissions/permission.exception.class";
import { CreateOAuthAppDto } from "../../../../../libraries/nestjs-libraries/src/dtos/oauth/create-oauth-app.dto";
import { UpdateOAuthAppDto } from "../../../../../libraries/nestjs-libraries/src/dtos/oauth/update-oauth-app.dto";
let OAuthAppController = class OAuthAppController {
    constructor(_oauthService) {
        this._oauthService = _oauthService;
    }
    getApp(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._oauthService.getApp(org.id);
        });
    }
    createApp(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._oauthService.createApp(org.id, body);
        });
    }
    updateApp(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._oauthService.updateApp(org.id, body);
        });
    }
    deleteApp(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._oauthService.deleteApp(org.id);
        });
    }
    rotateSecret(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._oauthService.rotateSecret(org.id);
        });
    }
};
__decorate([
    Get('/'),
    CheckPolicies([AuthorizationActions.Create, Sections.ADMIN]),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OAuthAppController.prototype, "getApp", null);
__decorate([
    Post('/'),
    CheckPolicies([AuthorizationActions.Create, Sections.ADMIN]),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateOAuthAppDto]),
    __metadata("design:returntype", Promise)
], OAuthAppController.prototype, "createApp", null);
__decorate([
    Put('/'),
    CheckPolicies([AuthorizationActions.Create, Sections.ADMIN]),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateOAuthAppDto]),
    __metadata("design:returntype", Promise)
], OAuthAppController.prototype, "updateApp", null);
__decorate([
    Delete('/'),
    CheckPolicies([AuthorizationActions.Create, Sections.ADMIN]),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OAuthAppController.prototype, "deleteApp", null);
__decorate([
    Post('/rotate-secret'),
    CheckPolicies([AuthorizationActions.Create, Sections.ADMIN]),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OAuthAppController.prototype, "rotateSecret", null);
OAuthAppController = __decorate([
    ApiTags('OAuth App'),
    Controller('/user/oauth-app'),
    __metadata("design:paramtypes", [OAuthService])
], OAuthAppController);
export { OAuthAppController };
//# sourceMappingURL=oauth-app.controller.js.map