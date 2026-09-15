import { HttpException, Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '@gitroom/nestjs-libraries/database/prisma/users/users.repository';
import { Provider, Role } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { EmailNotificationsDto } from '@gitroom/nestjs-libraries/dtos/users/email-notifications.dto';
import { ChangePasswordDto } from '@gitroom/nestjs-libraries/dtos/users/change.password.dto';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { IntegrationRepository } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { isWalletLoginEnabled } from '@gitroom/helpers/utils/wallet.login';
import dayjs from 'dayjs';
import {
  canCompleteSetPasswordWithToken,
  canUnlinkIdentity,
  decideLinkIdentity,
  emailsMatch,
  hasPasswordHash,
  isLinkableProvider,
  nextProviderNameAfterUnlink,
  normalizeEmail,
} from '@gitroom/helpers/auth/account-security';

@Injectable()
export class UsersService {
  constructor(
    private _usersRepository: UsersRepository,
    private _organizationRepository: OrganizationRepository,
    private _integrationRepository: IntegrationRepository,
    private _notificationService: NotificationService
  ) {}

  private readonly _logger = new Logger(UsersService.name);

  getUserByEmail(email: string) {
    return this._usersRepository.getUserByEmail(email);
  }

  getUserByEmailAnyProvider(email: string) {
    return this._usersRepository.getUserByEmailAnyProvider(email);
  }

  getUserByEmailWithPassword(email: string) {
    return this._usersRepository.getUserByEmailWithPassword(email);
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

  attachProviderId(userId: string, providerId: string) {
    return this._usersRepository.attachProviderId(userId, providerId);
  }

  attachAppleProviderId(userId: string, appleProviderId: string) {
    return this._usersRepository.attachAppleProviderId(userId, appleProviderId);
  }

  ensureIdentity(userId: string, provider: Provider, providerAccountId: string) {
    return this._usersRepository.ensureIdentity(
      userId,
      provider,
      providerAccountId
    );
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
              'Your PostQueen login was changed',
              `An administrator changed the login for your PostQueen account. ` +
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
    const orgs = await this._organizationRepository.getOrgsByUserId(userId);
    const ownedOrgs = orgs.filter(
      (org) => org.users[0].role === Role.SUPERADMIN
    );

    for (const org of ownedOrgs) {
      const team = await this._organizationRepository.getTeam(org.id);
      if (team?.users?.some((member) => member.user.id !== userId)) {
        throw new HttpException(
          'Please remove your team members before deleting your account',
          400
        );
      }
    }

    return ownedOrgs;
  }

  async deleteAccount(userId: string) {
    const deletedOrgs = await this.getOrgsToDeleteForAccount(userId);
    const orgs = await this._organizationRepository.getOrgsByUserId(userId);

    for (const org of orgs) {
      if (org.users[0].role === Role.SUPERADMIN) {
        await this._integrationRepository.deleteIntegrationsForAccount(org.id);
        await this._organizationRepository.deleteOrganization(org.id);
      } else {
        await this._organizationRepository.deleteTeamMember(org.id, userId);
      }
    }

    await this._usersRepository.deleteAccount(userId);

    this._logger.log(
      `Account ${userId} deleted, organizations removed: ${deletedOrgs
        .map((org) => org.id)
        .join(', ')}`
    );

    return { deletedOrgs };
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

  enabledOauthProviders() {
    return [
      { provider: Provider.GOOGLE, enabled: !!process.env.YOUTUBE_CLIENT_ID },
      { provider: Provider.GITHUB, enabled: !!process.env.GITHUB_CLIENT_ID },
      { provider: Provider.APPLE, enabled: !!process.env.APPLE_CLIENT_ID },
      {
        provider: Provider.GENERIC,
        enabled: !!process.env.POSTQUEEN_GENERIC_OAUTH,
      },
      { provider: Provider.FARCASTER, enabled: !!process.env.NEYNAR_CLIENT_ID },
      { provider: Provider.WALLET, enabled: isWalletLoginEnabled() },
    ];
  }

  async getIdentities(userId: string) {
    const user = await this._usersRepository.getUserById(userId);
    const identities = await this._usersRepository.getIdentities(userId);
    const linked = new Set(identities.map((row) => row.provider));
    const hasPassword = hasPasswordHash(user?.password);
    return {
      email: user?.email,
      name: user?.name,
      hasPassword,
      canUnlink: canUnlinkIdentity(hasPassword, identities.length),
      providers: this.enabledOauthProviders().map((row) => ({
        ...row,
        linked: linked.has(row.provider),
      })),
    };
  }

  async unlinkIdentity(userId: string, providerName: string) {
    const provider = providerName.toUpperCase() as Provider;
    if (!isLinkableProvider(provider)) {
      throw new HttpException('Unknown provider', 400);
    }

    const user = await this._usersRepository.getUserById(userId);
    if (!user) {
      throw new HttpException('User not found', 400);
    }

    const identities = await this._usersRepository.getIdentities(userId);
    const existing = identities.find((row) => row.provider === provider);
    if (!existing) {
      throw new HttpException('Identity is not linked', 400);
    }

    if (!canUnlinkIdentity(hasPasswordHash(user.password), identities.length)) {
      throw new HttpException(
        'Set a password or keep another sign-in method before unlinking',
        400
      );
    }

    await this._usersRepository.deleteIdentity(userId, provider);
    await this._usersRepository.clearLinkedProvider(userId, provider);

    const remaining = identities
      .filter((row) => row.provider !== provider)
      .map((row) => row.provider);
    const nextName = nextProviderNameAfterUnlink({
      nativeProvider: user.providerName,
      unlinkedProvider: provider,
      hasPassword: hasPasswordHash(user.password),
      remainingProviders: remaining,
    });
    if (nextName) {
      await this._usersRepository.updateProviderName(
        userId,
        nextName as Provider
      );
    }

    return { unlinked: true };
  }

  async linkIdentity(
    userId: string,
    providerName: string,
    providerAccountId: string
  ) {
    const provider = providerName.toUpperCase() as Provider;
    if (!isLinkableProvider(provider) || !providerAccountId) {
      throw new HttpException('Unknown provider', 400);
    }

    const existing = await this._usersRepository.findIdentity(
      provider,
      providerAccountId
    );
    const current = await this._usersRepository.findUserIdentity(
      userId,
      provider
    );
    const decision = decideLinkIdentity({
      currentUserId: userId,
      existingOwnerId: existing?.userId,
      currentProviderOwnerId: current?.userId,
    });

    if (!decision.ok) {
      throw new HttpException(
        decision.reason === 'taken'
          ? 'This account is already linked to another user'
          : 'This provider is already linked',
        409
      );
    }

    if (decision.reason === 'already') {
      return { linked: true };
    }

    await this._usersRepository.createIdentity(
      userId,
      provider,
      providerAccountId
    );

    if (provider === Provider.GOOGLE) {
      await this._usersRepository.attachProviderId(userId, providerAccountId);
    }
    if (provider === Provider.APPLE) {
      await this._usersRepository.attachAppleProviderId(
        userId,
        providerAccountId
      );
    }

    return { linked: true };
  }

  private readPurposeToken(
    token: string,
    purpose: 'email_change' | 'set_password'
  ) {
    let payload: {
      id?: string;
      email?: string;
      purpose?: string;
      expires?: string;
    };
    try {
      payload = AuthService.verifyJWT(token) as typeof payload;
    } catch {
      return null;
    }
    if (
      !payload?.id ||
      payload.purpose !== purpose ||
      !payload.expires ||
      dayjs(payload.expires).isBefore(dayjs())
    ) {
      return null;
    }
    return payload;
  }

  async changePassword(
    userId: string,
    body: ChangePasswordDto,
    stepUp: boolean
  ) {
    const user = await this._usersRepository.getUserById(userId);
    if (!user) {
      throw new HttpException('User not found', 400);
    }

    // A leftover set-password email must not skip current-password once a
    // hash exists. Ignore the token and fall through to bcrypt instead of
    // 400ing a caller who also sent the correct current password.
    if (
      body.token &&
      canCompleteSetPasswordWithToken(hasPasswordHash(user.password))
    ) {
      const payload = this.readPurposeToken(body.token, 'set_password');
      if (!payload || payload.id !== userId) {
        throw new HttpException('Invalid or expired token', 400);
      }
      await this._usersRepository.updatePassword(userId, body.password);
      return { changed: true };
    }

    if (hasPasswordHash(user.password)) {
      // Always bcrypt, including a missing current password, so timing does
      // not say whether the field was omitted.
      if (
        !AuthService.comparePassword(
          body.currentPassword || '',
          user.password!
        )
      ) {
        throw new HttpException('Current password is incorrect', 400);
      }
      await this._usersRepository.updatePassword(userId, body.password);
      return { changed: true };
    }

    if (stepUp) {
      await this._usersRepository.updatePassword(userId, body.password);
      return { changed: true };
    }

    if (!this._notificationService.hasEmailProvider()) {
      throw new HttpException(
        'Re-authenticate with a connected account to set a password',
        400
      );
    }

    const token = AuthService.signJWT(
      {
        id: user.id,
        purpose: 'set_password',
        expires: dayjs().add(20, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
      },
      { expiresIn: '20m' }
    );
    await this._notificationService.sendEmail(
      user.email,
      'Set your PostQueen password',
      `Click <a href="${process.env.FRONTEND_URL}/settings?tab=account&setPassword=${token}">here</a> to set a password. The link expires in 20 minutes.`
    );
    return { emailed: true };
  }

  async requestEmailChange(
    userId: string,
    nextEmail: string,
    password: string | undefined,
    stepUp: boolean
  ) {
    const user = await this._usersRepository.getUserById(userId);
    if (!user) {
      throw new HttpException('User not found', 400);
    }

    const email = normalizeEmail(nextEmail);
    if (emailsMatch(user.email, email)) {
      throw new HttpException('That is already your email', 400);
    }

    const conflict = await this._usersRepository.findEmailConflict(
      email,
      userId
    );
    if (conflict) {
      throw new HttpException('Email is already in use', 409);
    }

    if (hasPasswordHash(user.password)) {
      const passwordOk = AuthService.comparePassword(
        password || '',
        user.password!
      );
      if (!passwordOk && !stepUp) {
        throw new HttpException('Current password is incorrect', 400);
      }
    } else if (!stepUp) {
      throw new HttpException(
        'Re-authenticate with a connected account to change email',
        400
      );
    }

    if (!this._notificationService.hasEmailProvider()) {
      throw new HttpException('Email delivery is not configured', 400);
    }

    const token = AuthService.signJWT(
      {
        id: user.id,
        email,
        purpose: 'email_change',
        expires: dayjs().add(20, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
      },
      { expiresIn: '20m' }
    );

    await this._notificationService.sendEmail(
      email,
      'Confirm your new PostQueen email',
      `Click <a href="${process.env.FRONTEND_URL}/settings?tab=account&confirmEmail=${token}">here</a> to confirm this as your new email. The link expires in 20 minutes.`
    );
    await this._notificationService
      .sendEmail(
        user.email,
        'Your PostQueen email is being changed',
        `Someone requested to change the email on your PostQueen account to ${email}. If this was not you, sign in and change your password.`
      )
      .catch((err) =>
        this._logger.error(`Failed to notify ${user.email} of email change`, err)
      );

    return { sent: true };
  }

  async confirmEmailChange(userId: string, token: string) {
    const payload = this.readPurposeToken(token, 'email_change');
    if (!payload?.email || payload.id !== userId) {
      throw new HttpException('Invalid or expired token', 400);
    }

    const conflict = await this._usersRepository.findEmailConflict(
      payload.email,
      userId
    );
    if (conflict) {
      throw new HttpException('Email is already in use', 409);
    }

    await this._usersRepository.updateEmail(userId, normalizeEmail(payload.email));
    return { changed: true };
  }

  async confirmDeleteAccount(
    userId: string,
    email: string,
    password: string | undefined,
    stepUp: boolean
  ) {
    const user = await this._usersRepository.getUserById(userId);
    if (!user) {
      throw new HttpException('User not found', 400);
    }
    if (!emailsMatch(user.email, email)) {
      throw new HttpException('Email does not match this account', 400);
    }
    if (hasPasswordHash(user.password)) {
      const passwordOk = AuthService.comparePassword(
        password || '',
        user.password!
      );
      if (!passwordOk && !stepUp) {
        throw new HttpException('Current password is incorrect', 400);
      }
    } else if (!stepUp) {
      throw new HttpException(
        'Re-authenticate with a connected account to delete your account',
        400
      );
    }
  }
}
