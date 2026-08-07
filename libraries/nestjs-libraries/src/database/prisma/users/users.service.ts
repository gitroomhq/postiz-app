import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '@gitroom/nestjs-libraries/database/prisma/users/users.repository';
import { Provider } from '@prisma/client';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { EmailNotificationsDto } from '@gitroom/nestjs-libraries/dtos/users/email-notifications.dto';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';

@Injectable()
export class UsersService {
  constructor(
    private _usersRepository: UsersRepository,
    private _organizationRepository: OrganizationRepository,
    private _notificationService: NotificationService
  ) {}

  private readonly _logger = new Logger(UsersService.name);

  getUserByEmail(email: string) {
    return this._usersRepository.getUserByEmail(email);
  }

  getUserById(id: string) {
    return this._usersRepository.getUserById(id);
  }

  getUserWithActiveSubscriptionByEmail(email: string, excludeUserId: string) {
    return this._usersRepository.getUserWithActiveSubscriptionByEmail(
      email,
      excludeUserId
    );
  }

  getImpersonateUser(name: string) {
    return this._organizationRepository.getImpersonateUser(name);
  }

  getUserByProvider(providerId: string, provider: Provider) {
    return this._usersRepository.getUserByProvider(providerId, provider);
  }

  async switchUser(
    currentUserId: string,
    targetUserId: string,
    adminId: string
  ) {
    const { kept, switched } =
      await this._usersRepository.switchUserCredentials(
        currentUserId,
        targetUserId
      );

    this._logger.log(
      `User login switch performed by admin ${adminId}: account ${
        kept.id
      } login ${switched.email} -> ${kept.email}; account ${
        switched.id
      } login ${kept.email} -> ${switched.email}`
    );

    // the swap is already committed; a notification failure must not fail it
    if (this._notificationService.hasEmailProvider()) {
      await Promise.all(
        [kept, switched].map((account) =>
          this._notificationService
            .sendEmail(
              account.email,
              'Your Postiz login was changed',
              `An administrator changed the login for your Postiz account. ` +
                `You can now sign in using ${account.email}. ` +
                `Your subscription and plan were not changed by this switch — ` +
                `if you intended to cancel a subscription, please do that ` +
                `separately from your billing settings.`
            )
            .catch((err) =>
              this._logger.error(`Failed to notify ${account.email}`, err)
            )
        )
      );
    }

    return { kept, switched };
  }

  activateUser(id: string) {
    return this._usersRepository.activateUser(id);
  }

  updatePassword(id: string, password: string) {
    return this._usersRepository.updatePassword(id, password);
  }

  getPersonal(userId: string) {
    return this._usersRepository.getPersonal(userId);
  }

  changePersonal(userId: string, body: UserDetailDto) {
    return this._usersRepository.changePersonal(userId, body);
  }

  getEmailNotifications(userId: string) {
    return this._usersRepository.getEmailNotifications(userId);
  }

  updateEmailNotifications(userId: string, body: EmailNotificationsDto) {
    return this._usersRepository.updateEmailNotifications(userId, body);
  }
}
