import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Delete, Get, Param, Post, Put, Query, } from '@nestjs/common';
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { ApiTags } from '@nestjs/swagger';
import { WebhooksService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/webhooks/webhooks.service";
import { CheckPolicies } from "../../services/auth/permissions/permissions.ability";
import { UpdateDto, WebhooksDto, } from "../../../../../libraries/nestjs-libraries/src/dtos/webhooks/webhooks.dto";
import { AuthorizationActions, Sections } from "../../services/auth/permissions/permission.exception.class";
let WebhookController = class WebhookController {
    constructor(_webhooksService) {
        this._webhooksService = _webhooksService;
    }
    getStatistics(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._webhooksService.getWebhooks(org.id);
        });
    }
    createAWebhook(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._webhooksService.createWebhook(org.id, body);
        });
    }
    updateWebhook(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._webhooksService.createWebhook(org.id, body);
        });
    }
    deleteWebhook(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._webhooksService.deleteWebhook(org.id, id);
        });
    }
    sendWebhook(body, url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fetch(url, {
                    method: 'POST',
                    body: JSON.stringify(body),
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            catch (err) {
                /** sent **/
            }
            return { send: true };
        });
    }
};
__decorate([
    Get('/'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "getStatistics", null);
__decorate([
    Post('/'),
    CheckPolicies([AuthorizationActions.Create, Sections.WEBHOOKS]),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, WebhooksDto]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "createAWebhook", null);
__decorate([
    Put('/'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateDto]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "updateWebhook", null);
__decorate([
    Delete('/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "deleteWebhook", null);
__decorate([
    Post('/send'),
    __param(0, Body()),
    __param(1, Query('url')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "sendWebhook", null);
WebhookController = __decorate([
    ApiTags('Webhooks'),
    Controller('/webhooks'),
    __metadata("design:paramtypes", [WebhooksService])
], WebhookController);
export { WebhookController };
//# sourceMappingURL=webhooks.controller.js.map