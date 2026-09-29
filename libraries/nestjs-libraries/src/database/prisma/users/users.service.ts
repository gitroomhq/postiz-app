import { HttpException, Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '@gitroom/nestjs-libraries/database/prisma/users/users.repository';
import { Provider, Role } from '@prisma/client';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { EmailNotificationsDto } from '@gitroom/nestjs-libraries/dtos/users/email-notifications.dto';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { uniq } from 'lodash';

@Injectable()
export class UsersService {
  constructor(
    private _usersRepository: UsersRepository,
    private _organizationRepository: OrganizationRepository,
    private _integrationService: IntegrationService,
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
              'Your Postmonster login was changed',
              `An administrator changed the login for your Postmonster account. ` +
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

  async getOrgsToDeleteForAccount(userId: string) {
    // postmonster: only the workspaces where the account is the only member
    // are deleted (PRD 9); shared workspaces are left, not deleted
    const orgs = await this._organizationRepository.getOrgsByUserId(userId);
    const deletable = [] as typeof orgs;
    for (const org of orgs) {
      const team = await this._organizationRepository.getTeam(org.id);
      const others = (team?.users || []).filter(
        (member) => member.user.id !== userId
      );
      if (others.length === 0) {
        deletable.push(org);
      }
    }

    return deletable;
  }

  async deleteAccount(userId: string) {
    // postmonster: account deletion (PRD 9) - the sole-owner workspaces are
    // deleted, shared workspaces are just left (with an ownership handover);
    // DB changes run in one transaction, media files are removed afterwards
    const user = await this._usersRepository.getUserById(userId);
    if (!user || user.deletedAt) {
      throw new HttpException('Account not found', 400);
    }

    const orgs = await this._organizationRepository.getOrgsByUserId(userId);
    const deleteOrgIds: string[] = [];
    const leaveOrgs: { orgId: string; promoteNewOwner: boolean }[] = [];

    for (const org of orgs) {
      const team = await this._organizationRepository.getTeam(org.id);
      const others = (team?.users || []).filter(
        (member) => member.user.id !== userId
      );
      if (others.length === 0) {
        deleteOrgIds.push(org.id);
      } else {
        leaveOrgs.push({
          orgId: org.id,
          promoteNewOwner: org.users[0]?.role === Role.SUPERADMIN,
        });
      }
    }

    // platform grants are revoked while the tokens are still readable; best
    // effort - a failing revoke must never block the deletion
    for (const orgId of deleteOrgIds) {
      await this._integrationService.revokeTokensForOrg(orgId);
    }

    const files = await this._usersRepository.deleteAccountData(
      userId,
      deleteOrgIds,
      leaveOrgs
    );

    await this.removeAccountFiles(files);

    if (this._notificationService.hasEmailProvider()) {
      await this._notificationService
        .sendEmail(
          user.email,
          'Your Postmonster account has been deleted',
          'Your Postmonster account and its data have been deleted. ' +
            'Connected channels were disconnected and their access revoked. ' +
            'Backups are purged within 30 days. ' +
            'If this was a mistake, please contact support.'
        )
        .catch((err) =>
          this._logger.error(
            `Failed to send the deletion confirmation to ${user.email}`,
            err
          )
        );
    }

    this._logger.log(
      `Account ${userId} deleted, organizations removed: ${deleteOrgIds.join(
        ', '
      )}`
    );

    return { deletedOrgIds: deleteOrgIds, leftOrgIds: leaveOrgs.map((o) => o.orgId) };
  }

  // postmonster: files are removed outside the deletion transaction and only
  // ever come from our own uploads
  private async removeAccountFiles(paths: string[]) {
    const storage = UploadFactory.createStorage();
    const uploadsPrefix = `${process.env.FRONTEND_URL}/uploads`;
    for (const path of uniq(paths)) {
      if (!path) {
        continue;
      }
      if (path.indexOf('http') === 0 && path.indexOf(uploadsPrefix) !== 0) {
        continue;
      }
      try {
        await storage.removeFile(path);
      } catch (err) {
        this._logger.error(`Could not remove media file ${path}`, err);
      }
    }
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
