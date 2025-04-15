import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '@gitroom/nestjs-libraries/database/prisma/notifications/notifications.repository';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { BullMqClient } from '@gitroom/nestjs-libraries/bull-mq-transport-new/client';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import dayjs from 'dayjs';

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
    digest = false
  ) {
    const date = new Date().toISOString();
    await this._notificationRepository.createNotification(orgId, message);
    if (!sendEmail) {
      return;
    }

    if (digest) {
      await ioRedis.watch('digest_' + orgId);
      const value = await ioRedis.get('digest_' + orgId);
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

    await this.sendEmailsToOrg(orgId, subject, message);
  }

  async sendEmailsToOrg(orgId: string, subject: string, message: string) {
    const userOrg = await this._organizationRepository.getAllUsersOrgs(orgId);
    for (const user of userOrg?.users || []) {
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
