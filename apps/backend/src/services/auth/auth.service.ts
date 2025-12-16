import { Injectable } from '@nestjs/common';
import { Provider, User } from '@prisma/client';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { ProvidersFactory } from '@gitroom/backend/services/auth/providers/providers.factory';
import dayjs from 'dayjs';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { ForgotReturnPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot-return.password.dto';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { NewsletterService } from '@gitroom/nestjs-libraries/newsletter/newsletter.service';

@Injectable()
export class AuthService {
  constructor(
    private _userService: UsersService,
    private _organizationService: OrganizationService,
    private _notificationService: NotificationService,
    private _emailService: EmailService
  ) {}

  private isUnifiedEmailEnabled(): boolean {
    return process.env.UNIFIED_EMAIL_ACCOUNTS === 'true';
  }
  async canRegister(provider: string) {
    if (process.env.DISABLE_REGISTRATION !== 'true' || provider === Provider.GENERIC) {
      return true;
    }

    return (await this._organizationService.getCount()) === 0;
  }

  async routeAuth(
    provider: Provider,
    body: CreateOrgUserDto | LoginUserDto,
    ip: string,
    userAgent: string,
    addToOrg?: boolean | { orgId: string; role: 'USER' | 'ADMIN'; id: string }
  ) {
    if (provider === Provider.LOCAL) {
      if (process.env.DISALLOW_PLUS && body.email.includes('+')) {
        throw new Error('Email with plus sign is not allowed');
      }
      const user = await this._userService.getUserByEmail(body.email);
      if (body instanceof CreateOrgUserDto) {
        if (user) {
          throw new Error('Email already exists');
        }

        // Check if email exists with any other provider (e.g., Google, GitHub)
        // If UNIFIED_EMAIL_ACCOUNTS is enabled, require email verification before adding password
        if (this.isUnifiedEmailEnabled()) {
          const existingUserAnyProvider = await this._userService.getUserByEmailAnyProvider(body.email);
          if (existingUserAnyProvider) {
            // Don't set password immediately - require email verification first
            // This prevents account hijacking by someone who knows an email
            const addPasswordToken = AuthChecker.signJWT({
              id: existingUserAnyProvider.id,
              email: existingUserAnyProvider.email,
              passwordHash: AuthChecker.hashPassword(body.password),
              type: 'add-password',
            });

            await this._emailService.sendEmail(
              existingUserAnyProvider.email,
              'Verify to add password to your account',
              `Someone is trying to add a password to your account. If this was you, click <a href="${process.env.FRONTEND_URL}/auth/activate/${addPasswordToken}">here</a> to verify and set your password. If you did not request this, please ignore this email.`
            );

            return { addedOrg: false, jwt: '', activationRequired: true };
          }
        }

        if (!(await this.canRegister(provider))) {
          throw new Error('Registration is disabled');
        }

        const create = await this._organizationService.createOrgAndUser(
          body,
          ip,
          userAgent
        );

        const addedOrg =
          addToOrg && typeof addToOrg !== 'boolean'
            ? await this._organizationService.addUserToOrg(
                create.users[0].user.id,
                addToOrg.id,
                addToOrg.orgId,
                addToOrg.role
              )
            : false;

        const jwt = await this.jwt(create.users[0].user);
        await this._emailService.sendEmail(
          body.email,
          'Activate your account',
          `Click <a href="${process.env.FRONTEND_URL}/auth/activate/${jwt}">here</a> to activate your account`
        );
        // Activation required if email provider is configured
        const activationRequired = this._emailService.hasProvider();
        return { addedOrg, jwt, activationRequired };
      }

      // For login: check LOCAL account first, then any provider with password (if unified emails enabled)
      let loginUser = user;
      if (!loginUser && this.isUnifiedEmailEnabled()) {
        // Check if there's an OAuth account with this email that has a password set
        const oauthUser = await this._userService.getUserByEmailAnyProvider(body.email);
        if (oauthUser && oauthUser.password) {
          loginUser = oauthUser;
        }
      }

      if (!loginUser || !loginUser.password || !AuthChecker.comparePassword(body.password, loginUser.password)) {
        throw new Error('Invalid user name or password');
      }

      if (!loginUser.activated) {
        throw new Error('User is not activated');
      }

      return { addedOrg: false, jwt: await this.jwt(loginUser), activationRequired: false };
    }

    const user = await this.loginOrRegisterProvider(
      provider,
      body as CreateOrgUserDto,
      ip,
      userAgent
    );

    const addedOrg =
      addToOrg && typeof addToOrg !== 'boolean'
        ? await this._organizationService.addUserToOrg(
            user.id,
            addToOrg.id,
            addToOrg.orgId,
            addToOrg.role
          )
        : false;
    return { addedOrg, jwt: await this.jwt(user), activationRequired: false };
  }

  public getOrgFromCookie(cookie?: string) {
    if (!cookie) {
      return false;
    }

    try {
      const getOrg: any = AuthChecker.verifyJWT(cookie);
      if (dayjs(getOrg.timeLimit).isBefore(dayjs())) {
        return false;
      }

      return getOrg as {
        email: string;
        role: 'USER' | 'ADMIN';
        orgId: string;
        id: string;
      };
    } catch (err) {
      return false;
    }
  }

  private async loginOrRegisterProvider(
    provider: Provider,
    body: CreateOrgUserDto,
    ip: string,
    userAgent: string
  ) {
    const providerInstance = ProvidersFactory.loadProvider(provider);
    const providerUser = await providerInstance.getUser(body.providerToken);

    if (!providerUser) {
      throw new Error('Invalid provider token');
    }

    const user = await this._userService.getUserByProvider(
      providerUser.id,
      provider
    );
    if (user) {
      return user;
    }

    // Check if there's an existing account with the same email (any provider)
    // This allows users with email/password accounts to also sign in via OAuth (if unified emails enabled)
    if (this.isUnifiedEmailEnabled()) {
      const existingUserByEmail = await this._userService.getUserByEmailAnyProvider(
        providerUser.email
      );
      if (existingUserByEmail) {
        // If user is not activated, activate them now since OAuth provider verified the email
        if (!existingUserByEmail.activated) {
          await this._userService.activateUser(existingUserByEmail.id);
        }
        return existingUserByEmail;
      }
    }

    if (!(await this.canRegister(provider))) {
      throw new Error('Registration is disabled');
    }

    const create = await this._organizationService.createOrgAndUser(
      {
        company: body.company,
        email: providerUser.email,
        password: '',
        provider,
        providerId: providerUser.id,
      },
      ip,
      userAgent
    );

    await NewsletterService.register(providerUser.email);

    return create.users[0].user;
  }

  async forgot(email: string): Promise<{ success: boolean; message?: string }> {
    // Check for user with this email
    const user = this.isUnifiedEmailEnabled()
      ? await this._userService.getUserByEmailAnyProvider(email)
      : await this._userService.getUserByEmail(email);

    if (!user) {
      // Don't reveal if email exists for security
      return { success: true };
    }

    // Check if user has a password set (only relevant when unified emails enabled)
    if (this.isUnifiedEmailEnabled() && !user.password) {
      // User registered with OAuth and hasn't set a password
      return {
        success: false,
        message: 'This account was registered with OAuth (Google, GitHub, etc.). Please sign in using your OAuth provider, or register with email/password to set a password.'
      };
    }

    const resetValues = AuthChecker.signJWT({
      id: user.id,
      expires: dayjs().add(20, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
    });

    await this._notificationService.sendEmail(
      user.email,
      'Reset your password',
      `You have requested to reset your password. <br />Click <a href="${process.env.FRONTEND_URL}/auth/forgot/${resetValues}">here</a> to reset your password<br />The link will expire in 20 minutes`
    );

    return { success: true };
  }

  forgotReturn(body: ForgotReturnPasswordDto) {
    const user = AuthChecker.verifyJWT(body.token) as {
      id: string;
      expires: string;
    };
    if (dayjs(user.expires).isBefore(dayjs())) {
      return false;
    }

    // Use setPassword (works with any provider) if unified emails enabled, otherwise updatePassword (LOCAL only)
    return this.isUnifiedEmailEnabled()
      ? this._userService.setPassword(user.id, body.password)
      : this._userService.updatePassword(user.id, body.password);
  }

  async activate(code: string) {
    const tokenData = AuthChecker.verifyJWT(code) as {
      id: string;
      activated: boolean;
      email: string;
      passwordHash?: string;
      type?: string;
    };

    // Handle add-password flow (OAuth user adding password) - only when unified emails enabled
    if (this.isUnifiedEmailEnabled() && tokenData.type === 'add-password' && tokenData.passwordHash) {
      const user = await this._userService.getUserById(tokenData.id);
      if (!user) {
        return false;
      }
      // Set the password (passwordHash is already hashed)
      await this._userService.setPasswordHash(tokenData.id, tokenData.passwordHash);
      return this.jwt(user);
    }

    // Handle normal activation flow (new LOCAL user)
    if (tokenData.id && !tokenData.activated && tokenData.email) {
      const getUserAgain = await this._userService.getUserByEmail(tokenData.email);
      if (!getUserAgain || getUserAgain.activated) {
        return false;
      }
      await this._userService.activateUser(tokenData.id);
      getUserAgain.activated = true; // Reflect DB change in local object
      await NewsletterService.register(tokenData.email);
      return this.jwt(getUserAgain);
    }

    return false;
  }

  oauthLink(provider: string, query?: any) {
    const providerInstance = ProvidersFactory.loadProvider(
      provider as Provider
    );
    return providerInstance.generateLink(query);
  }

  async checkExists(provider: string, code: string) {
    const providerInstance = ProvidersFactory.loadProvider(
      provider as Provider
    );
    const token = await providerInstance.getToken(code);
    const user = await providerInstance.getUser(token);
    if (!user) {
      throw new Error('Invalid user');
    }
    const checkExists = await this._userService.getUserByProvider(
      user.id,
      provider as Provider
    );
    if (checkExists) {
      return { jwt: await this.jwt(checkExists) };
    }

    // Check if there's an existing account with the same email (any provider) - only when unified emails enabled
    // This allows users with email/password accounts to also sign in via OAuth
    if (this.isUnifiedEmailEnabled()) {
      const existingUserByEmail = await this._userService.getUserByEmailAnyProvider(
        user.email
      );
      if (existingUserByEmail) {
        // If user is not activated, activate them now since OAuth provider verified the email
        if (!existingUserByEmail.activated) {
          await this._userService.activateUser(existingUserByEmail.id);
        }
        return { jwt: await this.jwt(existingUserByEmail) };
      }
    }

    return { token };
  }

  private async jwt(user: User) {
    return AuthChecker.signJWT(user);
  }
}
