import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '@gitroom/nestjs-libraries/database/prisma/notifications/notifications.repository';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import { organizationId } from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';

export type NotificationType = 'success' | 'fail' | 'info';

@Injectable()
export class NotificationService {
  constructor(
    private _notificationRepository: NotificationsRepository,
    private _emailService: EmailService,
    private _organizationRepository: OrganizationRepository,
    private _temporalService: TemporalService
  ) {}

  getMainPageCount(organizationId: string, userId: string) {
    return this._notificationRepository.getMainPageCount(
      organizationId,
      userId
    );
  }

  getNotificationsPaginated(organizationId: string, page: number) {
    return this._notificationRepository.getNotificationsPaginated(
      organizationId,
      page
    );
  }

  getNotifications(organizationId: string, userId: string) {
    return this._notificationRepository.getNotifications(
      organizationId,
      userId
    );
  }

  async inAppNotification(
    orgId: string,
    subject: string,
    message: string,
    sendEmail = false,
    digest = false,
    type: NotificationType = 'success'
  ) {
    await this._notificationRepository.createNotification(orgId, message);
    if (!sendEmail) {
      return;
    }

    if (digest) {
      try {
        await this._temporalService.client
          .getRawClient()
          ?.workflow.signalWithStart('digestEmailWorkflow', {
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
          });
      } catch (err) {}

      return;
    }

    await this.sendEmailsToOrg(orgId, subject, message, type);
  }

  async sendEmailsToOrg(
    orgId: string,
    subject: string,
    message: string,
    type?: NotificationType
  ) {
    const userOrg = await this._organizationRepository.getAllUsersOrgs(orgId);
    for (const user of userOrg?.users || []) {
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
      await this.sendEmail(user.user.email, subject, message);
    }
  }

  async sendEmail(to: string, subject: string, html: string, replyTo?: string) {
    await this._emailService.sendEmail(to, subject, html, 'top', replyTo);
  }

  hasEmailProvider() {
    return this._emailService.hasProvider();
  }
}
