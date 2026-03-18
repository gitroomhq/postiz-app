import { __decorate, __metadata } from "tslib";
import { IsBoolean } from 'class-validator';
export class EmailNotificationsDto {
}
__decorate([
    IsBoolean(),
    __metadata("design:type", Boolean)
], EmailNotificationsDto.prototype, "sendSuccessEmails", void 0);
__decorate([
    IsBoolean(),
    __metadata("design:type", Boolean)
], EmailNotificationsDto.prototype, "sendFailureEmails", void 0);
__decorate([
    IsBoolean(),
    __metadata("design:type", Boolean)
], EmailNotificationsDto.prototype, "sendStreakEmails", void 0);
//# sourceMappingURL=email-notifications.dto.js.map