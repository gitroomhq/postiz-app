import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '@gitroom/nestjs-libraries/database/prisma/notifications/notifications.repository';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';

@Injectable()
export class NotificationService {
  constructor(
    private _notificationRepository: NotificationsRepository,
    private _emailService: EmailService,
    private _organizationRepository: OrganizationRepository
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

  async inAppNotification(orgId: string, subject: string, message: string, sendEmail = false) {
    await this._notificationRepository.createNotification(orgId, message);
    if (!sendEmail) {
      return;
    }

    const userOrg = await this._organizationRepository.getAllUsersOrgs(orgId);
    for (const user of userOrg?.users || []) {
      await this.sendEmail(user.user.email, subject, message);
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    await this._emailService.sendEmail(to, subject, html);
  }

  hasEmailProvider() {
    return this._emailService.hasProvider();
  }
}
