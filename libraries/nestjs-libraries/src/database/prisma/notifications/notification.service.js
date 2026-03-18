import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from "./notifications.repository";
import { EmailService } from "../../../services/email.service";
import { OrganizationRepository } from "../organizations/organization.repository";
import { TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import { organizationId } from "../../../temporal/temporal.search.attribute";
let NotificationService = class NotificationService {
    constructor(_notificationRepository, _emailService, _organizationRepository, _temporalService) {
        this._notificationRepository = _notificationRepository;
        this._emailService = _emailService;
        this._organizationRepository = _organizationRepository;
        this._temporalService = _temporalService;
    }
    getMainPageCount(organizationId, userId) {
        return this._notificationRepository.getMainPageCount(organizationId, userId);
    }
    getNotificationsPaginated(organizationId, page) {
        return this._notificationRepository.getNotificationsPaginated(organizationId, page);
    }
    getNotifications(organizationId, userId) {
        return this._notificationRepository.getNotifications(organizationId, userId);
    }
    inAppNotification(orgId_1, subject_1, message_1) {
        return __awaiter(this, arguments, void 0, function* (orgId, subject, message, sendEmail = false, digest = false, type = 'success') {
            var _a;
            yield this._notificationRepository.createNotification(orgId, message);
            if (!sendEmail) {
                return;
            }
            if (digest) {
                try {
                    yield ((_a = this._temporalService.client
                        .getRawClient()) === null || _a === void 0 ? void 0 : _a.workflow.signalWithStart('digestEmailWorkflow', {
                        workflowId: 'digest_email_workflow_' + orgId,
                        signal: 'email',
                        signalArgs: [
                            [
                                {
                                    title: subject,
                                    message,
                                    type,
                                },
                            ],
                        ],
                        taskQueue: 'main',
                        workflowIdConflictPolicy: 'USE_EXISTING',
                        args: [{ organizationId: orgId }],
                        typedSearchAttributes: new TypedSearchAttributes([
                            {
                                key: organizationId,
                                value: orgId,
                            },
                        ]),
                    }));
                }
                catch (err) { }
                return;
            }
            yield this.sendEmailsToOrg(orgId, subject, message, type);
        });
    }
    sendEmailsToOrg(orgId, subject, message, type) {
        return __awaiter(this, void 0, void 0, function* () {
            const userOrg = yield this._organizationRepository.getAllUsersOrgs(orgId);
            for (const user of (userOrg === null || userOrg === void 0 ? void 0 : userOrg.users) || []) {
                // 'info' type is always sent regardless of preferences
                if (type !== 'info') {
                    // Filter users based on their email preferences
                    if (type === 'success' && !user.user.sendSuccessEmails) {
                        continue;
                    }
                    if (type === 'fail' && !user.user.sendFailureEmails) {
                        continue;
                    }
                }
                yield this.sendEmail(user.user.email, subject, message);
            }
        });
    }
    sendEmail(to, subject, html, replyTo) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._emailService.sendEmail(to, subject, html, 'top', replyTo);
        });
    }
    hasEmailProvider() {
        return this._emailService.hasProvider();
    }
};
NotificationService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [NotificationsRepository,
        EmailService,
        OrganizationRepository,
        TemporalService])
], NotificationService);
export { NotificationService };
//# sourceMappingURL=notification.service.js.map