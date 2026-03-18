import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Controller, Delete, Get, Param } from '@nestjs/common';
import { GetUserFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/user.from.request";
import { ApiTags } from '@nestjs/swagger';
import { OAuthService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/oauth/oauth.service";
let ApprovedAppsController = class ApprovedAppsController {
    constructor(_oauthService) {
        this._oauthService = _oauthService;
    }
    list(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._oauthService.getApprovedApps(user.id);
        });
    }
    revoke(user, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._oauthService.revokeApp(user.id, id);
        });
    }
};
__decorate([
    Get('/'),
    __param(0, GetUserFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ApprovedAppsController.prototype, "list", null);
__decorate([
    Delete('/:id'),
    __param(0, GetUserFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ApprovedAppsController.prototype, "revoke", null);
ApprovedAppsController = __decorate([
    ApiTags('Approved Apps'),
    Controller('/user/approved-apps'),
    __metadata("design:paramtypes", [OAuthService])
], ApprovedAppsController);
export { ApprovedAppsController };
//# sourceMappingURL=approved-apps.controller.js.map