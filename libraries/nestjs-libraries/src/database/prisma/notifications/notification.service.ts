import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '@gitroom/nestjs-libraries/database/prisma/notifications/notifications.repository';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { BullMqClient } from '@gitroom/nestjs-libraries/bull-mq-transport-new/client';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import dayjs from 'dayjs';

export type NotificationType = 'success' | 'fail' | 'info';

@Injectable()
export class NotificationService {
  constructor(
    private _notificationRepository: NotificationsRepository,
    private _emailService: EmailService,
    private _organizationRepository: OrganizationRepository,
    private _workerServiceProducer: BullMqClient
  ) {}

  getMainPageCount(organizationId: string, userId: string) {
    return this._notificationRepository.getMainPageCount(
      organizationId,
      userId
    );
  }

  getNotifications(organizationId: string, userId: string) {
    return this._notificationRepository.getNotifications(
      organizationId,
      userId
    );
  }

  getNotificationsSince(organizationId: string, since: string) {
    return this._notificationRepository.getNotificationsSince(
      organizationId,
      since
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
    const date = new Date().toISOString();
    await this._notificationRepository.createNotification(orgId, message);
    if (!sendEmail) {
      return;
    }

    if (digest) {
      await ioRedis.watch('digest_' + orgId);
      const value = await ioRedis.get('digest_' + orgId);

      // Track notification types in the digest
      const typesKey = 'digest_types_' + orgId;
      await ioRedis.sadd(typesKey, type);
      await ioRedis.expire(typesKey, 120); // Slightly longer than digest window

      if (value) {
        return;
      }

      await ioRedis
        .multi()
        .set('digest_' + orgId, date)
        .expire('digest_' + orgId, 60)
        .exec();

      this._workerServiceProducer.emit('sendDigestEmail', {
        id: 'digest_' + orgId,
        options: {
          delay: 60000,
        },
        payload: {
          subject,
          org: orgId,
          since: date,
        },
      });

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

  async getDigestTypes(orgId: string): Promise<NotificationType[]> {
    const typesKey = 'digest_types_' + orgId;
    const types = await ioRedis.smembers(typesKey);
    // Clean up the types key after reading
    await ioRedis.del(typesKey);
    return types as NotificationType[];
  }

  async sendDigestEmailsToOrg(
    orgId: string,
    subject: string,
    message: string,
    types: NotificationType[]
  ) {
    const userOrg = await this._organizationRepository.getAllUsersOrgs(orgId);
    const hasInfo = types.includes('info');
    const hasSuccess = types.includes('success');
    const hasFail = types.includes('fail');

    for (const user of userOrg?.users || []) {
      // 'info' type is always sent regardless of preferences
      if (hasInfo) {
        await this.sendEmail(user.user.email, subject, message);
        continue;
      }

      // For digest, check if user wants any of the notification types in the digest
      const wantsSuccess = hasSuccess && user.user.sendSuccessEmails;
      const wantsFail = hasFail && user.user.sendFailureEmails;

      // Only send if user wants at least one type of notification in the digest
      if (!wantsSuccess && !wantsFail) {
        continue;
      }

      await this.sendEmail(user.user.email, subject, message);
    }
  }

  async sendEmail(to: string, subject: string, html: string, replyTo?: string) {
    await this._emailService.sendEmail(to, subject, html, replyTo);
  }

  hasEmailProvider() {
    return this._emailService.hasProvider();
  }
}
