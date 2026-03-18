import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Controller, Get } from '@nestjs/common';
import { GetUserFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/user.from.request";
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { NotificationService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/notifications/notification.service";
import { ApiTags } from '@nestjs/swagger';
let NotificationsController = class NotificationsController {
    constructor(_notificationsService) {
        this._notificationsService = _notificationsService;
    }
    mainPageList(user, organization) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._notificationsService.getMainPageCount(organization.id, user.id);
        });
    }
    notifications(user, organization) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._notificationsService.getNotifications(organization.id, user.id);
        });
    }
};
__decorate([
    Get('/'),
    __param(0, GetUserFromRequest()),
    __param(1, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "mainPageList", null);
__decorate([
    Get('/list'),
    __param(0, GetUserFromRequest()),
    __param(1, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "notifications", null);
NotificationsController = __decorate([
    ApiTags('Notifications'),
    Controller('/notifications'),
    __metadata("design:paramtypes", [NotificationService])
], NotificationsController);
export { NotificationsController };
//# sourceMappingURL=notifications.controller.js.map