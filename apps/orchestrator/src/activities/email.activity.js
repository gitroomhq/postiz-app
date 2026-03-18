import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { EmailService } from "../../../../libraries/nestjs-libraries/src/services/email.service";
import { OrganizationService } from "../../../../libraries/nestjs-libraries/src/database/prisma/organizations/organization.service";
let EmailActivity = class EmailActivity {
    constructor(_emailService, _organizationService) {
        this._emailService = _emailService;
        this._organizationService = _organizationService;
    }
    sendEmail(to, subject, html, replyTo) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._emailService.sendEmailSync(to, subject, html, replyTo);
        });
    }
    sendEmailAsync(to, subject, html, sendTo, replyTo) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._emailService.sendEmail(to, subject, html, sendTo, replyTo);
        });
    }
    getUserOrgs(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organizationService.getTeam(id);
        });
    }
    setStreak(organizationId, type) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organizationService.setStreak(organizationId, type);
        });
    }
};
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], EmailActivity.prototype, "sendEmail", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], EmailActivity.prototype, "sendEmailAsync", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailActivity.prototype, "getUserOrgs", null);
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EmailActivity.prototype, "setStreak", null);
EmailActivity = __decorate([
    Injectable(),
    Activity(),
    __metadata("design:paramtypes", [EmailService,
        OrganizationService])
], EmailActivity);
export { EmailActivity };
//# sourceMappingURL=email.activity.js.map