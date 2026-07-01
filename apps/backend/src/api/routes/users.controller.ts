import {
  Body,
  Controller,
  Get,
  HttpException,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { sign } from 'jsonwebtoken';
import { Organization, User } from '@prisma/client';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { Response, Request } from 'express';
import { AuthService } from '@gitroom/backend/services/auth/auth.service';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { getCookieUrlFromDomain } from '@gitroom/helpers/subdomain/subdomain.management';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { EmailNotificationsDto } from '@gitroom/nestjs-libraries/dtos/users/email-notifications.dto';
import { HttpForbiddenException } from '@gitroom/nestjs-libraries/services/exception.filter';
import { RealIP } from 'nestjs-real-ip';
import { UserAgent } from '@gitroom/nestjs-libraries/user/user.agent';
import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';
import { TrackService } from '@gitroom/nestjs-libraries/track/track.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';

@ApiTags('User')
@Controller('/user')
export class UsersController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _stripeService: StripeService,
    private _authService: AuthService,
    private _orgService: OrganizationService,
    private _userService: UsersService,
    private _trackService: TrackService,
    private _notificationService: NotificationService
  ) {}

  private readonly _logger = new Logger(UsersController.name);

  @Get('/chatbase-token')
  async getChatbaseToken(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization
  ) {
    if (!process.env.CHATBASE_TOKEN) {
      throw new HttpException('Chatbase SSO is not configured', 400);
    }

    const token = sign(
      {
        user_id: organization.id,
        email: user.email,
        ...(organization.paymentId
          ? {
              stripe_accounts: [
                {
                  label: organization.name,
                  stripe_id: organization.paymentId,
                },
              ],
            }
          : {}),
      },
      process.env.CHATBASE_TOKEN,
      { expiresIn: '1h' }
    );

    return { token };
  }

  @Get('/agent-media-sso')
  async getAgentMediaSsoUrl(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization
  ) {
    if (!process.env.AGENT_MEDIA_SSO_KEY) {
      throw new HttpException('Agent Media SSO is not configured', 400);
    }

    const token = sign(
      { id: organization.id, displayName: organization.name },
      process.env.AGENT_MEDIA_SSO_KEY
    );

    return { url: `https://agent-media.ai/sso/${token}` };
  }

  @Get('/self')
  async getSelf(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Req() req: Request
  ) {
    if (!organization) {
      throw new HttpForbiddenException();
    }

    const impersonate = req.cookies.impersonate || req.headers.impersonate;
    // @ts-ignore
    return {
      ...user,
      orgId: organization.id,
      totalChannels: !process.env.STRIPE_PUBLISHABLE_KEY
        ? 10000
        : // @ts-ignore
          organization?.subscription?.totalChannels || pricing.FREE.channel,
      tier:
        // @ts-ignore
        organization?.subscription?.subscriptionTier ||
        (!process.env.STRIPE_PUBLISHABLE_KEY ? 'ULTIMATE' : 'FREE'),
      // @ts-ignore
      role: organization?.users[0]?.role,
      // @ts-ignore
      isLifetime: !!organization?.subscription?.isLifetime,
      // An admin-granted subscription stores the user id in `paymentId` rather
      // than a real Stripe `cus_...` customer; used to expose an admin-only
      // remove action without risking a real paid subscription.
      adminGrantedSubscription:
        // @ts-ignore
        !!organization?.subscription &&
        !organization?.paymentId?.startsWith('cus_'),
      admin: !!user.isSuperAdmin,
      impersonate: !!impersonate,
      isTrailing: !process.env.STRIPE_PUBLISHABLE_KEY
        ? false
        : organization?.isTrailing,
      allowTrial: organization?.allowTrial,
      // A real Stripe customer has a `cus_...` paymentId. Admin-granted
      // subscriptions store the user id there instead, and never-subscribed
      // orgs have none, so gate billing-portal UI on this to avoid calling
      // Stripe with a non-existent customer ("No such customer").
      hasStripeCustomer: !!organization?.paymentId?.startsWith('cus_'),
      streakSince: organization?.streakSince || null,
      publicApi:
        // @ts-ignore
        organization?.users[0]?.role === 'SUPERADMIN' ||
        // @ts-ignore
        organization?.users[0]?.role === 'ADMIN'
          ? organization?.apiKey
          : '',
    };
  }

  @Get('/personal')
  async getPersonalInformation(@GetUserFromRequest() user: User) {
    return this._userService.getPersonal(user.id);
  }

  @Get('/impersonate')
  async getImpersonate(
    @GetUserFromRequest() user: User,
    @Query('name') name: string
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }

    return this._userService.getImpersonateUser(name, user.id);
  }

  @Post('/impersonate')
  async setImpersonate(
    @GetUserFromRequest() user: User,
    @Body('id') id: string,
    @Res({ passthrough: true }) response: Response
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }

    response.cookie('impersonate', id, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(!process.env.NOT_SECURED
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });

    if (process.env.NOT_SECURED) {
      response.header('impersonate', id);
    }
  }

  @Post('/switch')
  async switchUser(
    @GetUserFromRequest() user: User,
    @Body('id') id: string,
    @Req() req: Request
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }

    if (!id || id === user.id) {
      throw new HttpException('Invalid user to switch to', 400);
    }

    // `user` is the impersonated account; `id` is the account whose login it is
    // being swapped with. The swap keeps both user ids (and therefore their
    // organizations, subscriptions, channels and media) in place and only
    // trades the login credentials, so each login now reaches the other's data.
    const oldEmail = user.email;
    const { kept, switched } = await this._userService.switchUser(user.id, id);

    // Audit: `user` is the impersonated account, so read the real admin id from
    // the underlying auth token.
    const adminId = this.getRequestUserId(req);
    this._logger.log(
      `User login switch performed${
        adminId ? ` by admin ${adminId}` : ''
      }: account ${kept.id} login ${oldEmail} -> ${kept.email}; account ${
        switched.id
      } login ${kept.email} -> ${switched.email}`
    );

    // Mirror the swap onto Stripe: each org's customer now belongs to whoever
    // logs in with the owner's new email.
    await this.syncStripeCustomersEmail([kept, switched]);

    // If a login ended up on a never-verified email, it must be re-verified, so
    // send it a fresh activation link. Failures must not fail the request.
    await Promise.all(
      [kept, switched].map(async (account) => {
        if (account.activated) {
          return;
        }
        try {
          await this._authService.resendActivationEmail(account.email);
        } catch (err) {
          this._logger.error(
            `Failed to send activation email to ${account.email}`,
            err
          );
        }
      })
    );

    // Let both accounts know their login changed. The swap is already
    // committed, so a notification failure must not fail the request.
    try {
      await Promise.all([
        this.notifyUserOfSwitch(kept.id, kept.email),
        this.notifyUserOfSwitch(switched.id, switched.email),
      ]);
    } catch (err) {
      this._logger.error('Failed to notify users after login switch', err);
    }

    return { success: true };
  }

  private getRequestUserId(req: Request): string | null {
    try {
      const auth = (req.headers.auth as string) || req.cookies?.auth;
      const payload = AuthChecker.verifyJWT(auth) as { id?: string } | null;
      return payload?.id || null;
    } catch {
      return null;
    }
  }

  private async notifyUserOfSwitch(userId: string, email: string) {
    const subject = 'Your Postiz login was changed';
    const message =
      `An administrator changed the login for your Postiz account. ` +
      `You can now sign in using ${email}. ` +
      `Your subscription and plan were not changed by this switch — if you ` +
      `intended to cancel a subscription, please do that separately from your ` +
      `billing settings.`;

    const organizations = await this._orgService.getOrgsByUserId(userId);
    await Promise.all(
      organizations.map(async (org) => {
        // In-app notifications are organization-scoped, so posting to a shared
        // organization would show "your login changed" to co-members who were
        // not part of the switch. Only post where this user is the sole member;
        // the email below reaches the switched login specifically in every case.
        const team = await this._orgService.getTeam(org.id);
        if ((team?.users?.length || 0) > 1) {
          return;
        }
        await this._notificationService.inAppNotification(
          org.id,
          subject,
          message,
          false,
          false,
          'info'
        );
      })
    );

    if (this._notificationService.hasEmailProvider()) {
      await this._notificationService.sendEmail(email, subject, message);
    }
  }

  private async syncStripeCustomersEmail(
    accounts: { id: string; email: string }[]
  ) {
    // Map each real Stripe customer to the login email it should now carry.
    // Two guards for multi-user organizations:
    // - Owner-only: only the org owner's (SUPERADMIN) login drives its billing
    //   email, so a non-owner member's switch never rewrites a shared org's
    //   receipts address.
    // - Dedupe: each customer is updated once even when both switched accounts
    //   own the same organization (the first account processed wins), avoiding
    //   two concurrent, racing updates to the same customer.
    // Only real Stripe customers are touched — admin-granted subscriptions store
    // the user id in `paymentId` (not a `cus_...` id), so calling Stripe for
    // them only produces failed requests.
    const emailByCustomer = new Map<string, string>();
    for (const account of accounts) {
      const organizations = await this._orgService.getOrgsByUserId(account.id);
      for (const org of organizations) {
        const role = org.users?.[0]?.role;
        if (
          role === 'SUPERADMIN' &&
          org.paymentId?.startsWith('cus_') &&
          !emailByCustomer.has(org.paymentId)
        ) {
          emailByCustomer.set(org.paymentId, account.email);
        }
      }
    }
    await Promise.all(
      [...emailByCustomer].map(([customerId, email]) =>
        this._stripeService.updateCustomerEmail(customerId, email)
      )
    );
  }

  @Post('/personal')
  async changePersonal(
    @GetUserFromRequest() user: User,
    @Body() body: UserDetailDto
  ) {
    return this._userService.changePersonal(user.id, body);
  }

  @Get('/email-notifications')
  async getEmailNotifications(@GetUserFromRequest() user: User) {
    return this._userService.getEmailNotifications(user.id);
  }

  @Post('/email-notifications')
  async updateEmailNotifications(
    @GetUserFromRequest() user: User,
    @Body() body: EmailNotificationsDto
  ) {
    return this._userService.updateEmailNotifications(user.id, body);
  }

  @Post('/api-key/rotate')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async rotateApiKey(@GetOrgFromRequest() organization: Organization) {
    return this._orgService.updateApiKey(organization.id);
  }

  @Get('/subscription')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async getSubscription(@GetOrgFromRequest() organization: Organization) {
    const subscription =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organization.id
      );

    return subscription ? { subscription } : { subscription: undefined };
  }

  @Get('/subscription/tiers')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async tiers() {
    return this._stripeService.getPackages();
  }

  @Post('/join-org')
  async joinOrg(
    @GetUserFromRequest() user: User,
    @Body('org') org: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const getOrgFromCookie = this._authService.getOrgFromCookie(org);

    if (!getOrgFromCookie) {
      return response.status(200).json({ id: null });
    }

    const addedOrg = await this._orgService.addUserToOrg(
      user.id,
      getOrgFromCookie.id,
      getOrgFromCookie.orgId,
      getOrgFromCookie.role
    );

    response.status(200).json({
      id: typeof addedOrg !== 'boolean' ? addedOrg.organizationId : null,
    });
  }

  @Get('/organizations')
  async getOrgs(@GetUserFromRequest() user: User) {
    return (await this._orgService.getOrgsByUserId(user.id)).filter(
      (f) => !f.users[0].disabled
    );
  }

  @Post('/change-org')
  changeOrg(
    @Body('id') id: string,
    @Res({ passthrough: true }) response: Response
  ) {
    response.cookie('showorg', id, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(!process.env.NOT_SECURED
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });

    if (process.env.NOT_SECURED) {
      response.header('showorg', id);
    }

    response.status(200).send();
  }

  @Post('/logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.header('logout', 'true');
    response.cookie('auth', '', {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(!process.env.NOT_SECURED
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      maxAge: -1,
      expires: new Date(0),
    });

    response.cookie('showorg', '', {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(!process.env.NOT_SECURED
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      maxAge: -1,
      expires: new Date(0),
    });

    response.cookie('impersonate', '', {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(!process.env.NOT_SECURED
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      maxAge: -1,
      expires: new Date(0),
    });

    response.status(200).send();
  }

  @Post('/t')
  async trackEvent(
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
    @GetUserFromRequest() user: User,
    @RealIP() ip: string,
    @UserAgent() userAgent: string,
    @Body()
    body: { tt: TrackEnum; fbclid: string; additional: Record<string, any> }
  ) {
    const uniqueId = req?.cookies?.track || makeId(10);
    const fbclid = req?.cookies?.fbclid || body.fbclid;
    await this._trackService.track(
      uniqueId,
      ip,
      userAgent,
      body.tt,
      body.additional,
      fbclid,
      user
    );
    if (!req.cookies.track) {
      res.cookie('track', uniqueId, {
        domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
        ...(!process.env.NOT_SECURED
          ? {
              secure: true,
              httpOnly: true,
              sameSite: 'none',
            }
          : {}),
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      });
    }

    res.status(200).json({
      track: uniqueId,
    });
  }
}
