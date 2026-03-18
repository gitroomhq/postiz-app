import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Delete, Get, Param, Post, Put, Query, } from '@nestjs/common';
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from "../../services/auth/permissions/permissions.ability";
import { AutopostService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/autopost/autopost.service";
import { AutopostDto } from "../../../../../libraries/nestjs-libraries/src/dtos/autopost/autopost.dto";
import { AuthorizationActions, Sections } from "../../services/auth/permissions/permission.exception.class";
let AutopostController = class AutopostController {
    constructor(_autopostsService) {
        this._autopostsService = _autopostsService;
    }
    getAutoposts(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._autopostsService.getAutoposts(org.id);
        });
    }
    createAutopost(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._autopostsService.createAutopost(org.id, body);
        });
    }
    updateAutopost(org, body, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._autopostsService.createAutopost(org.id, body, id);
        });
    }
    deleteAutopost(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._autopostsService.deleteAutopost(org.id, id);
        });
    }
    changeActive(org, id, active) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._autopostsService.changeActive(org.id, id, active);
        });
    }
    sendWebhook(url) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._autopostsService.loadXML(url);
        });
    }
};
__decorate([
    Get('/'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AutopostController.prototype, "getAutoposts", null);
__decorate([
    Post('/'),
    CheckPolicies([AuthorizationActions.Create, Sections.WEBHOOKS]),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, AutopostDto]),
    __metadata("design:returntype", Promise)
], AutopostController.prototype, "createAutopost", null);
__decorate([
    Put('/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __param(2, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, AutopostDto, String]),
    __metadata("design:returntype", Promise)
], AutopostController.prototype, "updateAutopost", null);
__decorate([
    Delete('/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AutopostController.prototype, "deleteAutopost", null);
__decorate([
    Post('/:id/active'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body('active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Boolean]),
    __metadata("design:returntype", Promise)
], AutopostController.prototype, "changeActive", null);
__decorate([
    Post('/send'),
    __param(0, Query('url')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AutopostController.prototype, "sendWebhook", null);
AutopostController = __decorate([
    ApiTags('Autopost'),
    Controller('/autopost'),
    __metadata("design:paramtypes", [AutopostService])
], AutopostController);
export { AutopostController };
//# sourceMappingURL=autopost.controller.js.map