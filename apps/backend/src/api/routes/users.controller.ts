import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { sign } from 'jsonwebtoken';
import { Organization, User } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { PaymentService } from '@gitroom/nestjs-libraries/services/payment/payment.service';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { Response, Request } from 'express';
import { AuthService } from '@gitroom/backend/services/auth/auth.service';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { getCookieUrlFromDomain } from '@gitroom/helpers/subdomain/subdomain.management';
import {
  pricing,
  trialWindow,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { EmailNotificationsDto } from '@gitroom/nestjs-libraries/dtos/users/email-notifications.dto';
import { ChangePasswordDto } from '@gitroom/nestjs-libraries/dtos/users/change.password.dto';
import { RequestEmailChangeDto } from '@gitroom/nestjs-libraries/dtos/users/request.email.change.dto';
import { ConfirmEmailChangeDto } from '@gitroom/nestjs-libraries/dtos/users/confirm.email.change.dto';
import { DeleteAccountDto } from '@gitroom/nestjs-libraries/dtos/users/delete.account.dto';
import { SameOriginGuard } from '@gitroom/backend/services/auth/same-origin.guard';
import { AbuseGuardService } from '@gitroom/nestjs-libraries/services/abuse-guard.service';
import {
  isLinkableProvider,
  oauthLinkNonceFromState,
} from '@gitroom/helpers/auth/account-security';
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
import { isBillingEnabled } from '@gitroom/helpers/utils/billing.enabled';
import { areCookiesSecured } from '@gitroom/helpers/utils/cookies.secured';

@ApiTags('User')
@Controller('/user')
export class UsersController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _paymentService: PaymentService,
    // Stripe-only reads (the discount banner, a refused renewal, the
    // founding fee) have no counterpart on other providers.
    private _stripeService: StripeService,
    private _authService: AuthService,
    private _orgService: OrganizationService,
    private _userService: UsersService,
    private _trackService: TrackService,
    private _abuseGuardService: AbuseGuardService
  ) {}

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

  @Get('/self')
  async getSelf(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Req() req: Request
  ) {
    if (!organization) {
      throw new HttpForbiddenException();
    }

    // Deferred founding purchase: charge the founding fee once the 7-day window closes even
    // if the user never opens FinishTrial (that overlay was the only caller).
    // Early-returns inside settle when nothing is owed; idempotent when due.
    // @ts-ignore
    if (isBillingEnabled() && organization?.subscription?.isLifetime) {
      try {
        await this._stripeService.settleFoundingLifetimeAfterTrial(
          organization.id
        );
      } catch (err) {}
    }

    // Lock-until-paid: deferred founding fee still owed after the trial window
    // closes. Mid-trial failures keep DB isTrailing set; after the window,
    // middleware-derived isTrailing is false — this flag keeps founding locks
    // and the Billing strip honest until settle succeeds.
    let lifetimePaymentPending = false;
    // @ts-ignore
    if (isBillingEnabled() && organization?.subscription?.isLifetime) {
      try {
        const owed = await this._stripeService.isDeferredFoundingFeeOwed(
          organization.id
        );
        lifetimePaymentPending =
          owed && !trialWindow(organization.createdAt).open;
      } catch (err) {}
    }

    const impersonate = req.cookies.impersonate || req.headers.impersonate;
    const { password: _password, ...safeUser } = user as User & {
      password?: string | null;
    };
    void _password;
    // @ts-ignore
    return {
      ...safeUser,
      orgId: organization.id,
      // Billing off: the top tier's own number, which the UI renders as
      // "Unlimited" (10000 was shown as a literal 10000).
      totalChannels: !isBillingEnabled()
        ? pricing.AGENCY.channel
        : // @ts-ignore
          organization?.subscription?.totalChannels || pricing.FREE.channel,
      // Self-host / billing off: everything is open, so the top sellable tier,
      // whatever Subscription row the database still holds. A row left from a
      // time billing was on (or from testing) used to win here and put a paid
      // tier's feature locks and the founding chip on an instance that sells
      // nothing — the same reason totalChannels and isTrailing ignore it.
      tier: !isBillingEnabled()
        ? 'AGENCY'
        : // @ts-ignore
          organization?.subscription?.subscriptionTier || 'FREE',
      // @ts-ignore
      role: organization?.users[0]?.role,
      isLifetime:
        // @ts-ignore
        isBillingEnabled() && !!organization?.subscription?.isLifetime,
      admin: !!user.isSuperAdmin,
      impersonate: !!impersonate,
      isTrailing: !isBillingEnabled()
        ? false
        : organization?.isTrailing,
      lifetimePaymentPending,
      // Billing off: no trial to offer and no subscription to have ended.
      allowTrial: isBillingEnabled() && !!organization?.allowTrial,
      streakSince: organization?.streakSince || null,
      // Paid-then-cancelled: Subscription row is hard-deleted, so cancel day
      // lives on the org. Active cancel-at-period-end still has cancelAt on
      // the subscription include when present.
      // @ts-ignore
      subscriptionEndedAt: !isBillingEnabled()
        ? null
        : // @ts-ignore
          organization?.subscriptionEndedAt ||
          // @ts-ignore
          organization?.subscription?.cancelAt ||
          null,
      publicApi:
        // @ts-ignore
        organization?.users[0]?.role === 'SUPERADMIN' ||
        // @ts-ignore
        organization?.users[0]?.role === 'ADMIN'
          ? organization?.apiKey
          : '',
      orgName: organization.name,
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

    return this._userService.getImpersonateUser(name);
  }

  @Post('/impersonate')
  async setImpersonate(
    @GetUserFromRequest() user: User,
    @Body('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }

    // The only record of who acted inside whose account. While impersonating,
    // `user` is the account being impersonated, so the admin comes from the
    // token. An empty id is "stop impersonating".
    Logger.warn(
      `admin ${this.getRequestUserId(req) || user.id} ${
        id ? `started impersonating user-organization ${id}` : 'stopped impersonating'
      }`,
      'Impersonation'
    );

    response.cookie('impersonate', id, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(areCookiesSecured()
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });

    if (!areCookiesSecured()) {
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

    // `user` is the impersonated account, so the admin id comes from the token.
    // Require an active impersonation session and never allow the admin's own
    // account in the swap — either would trade away the admin's login.
    const adminId = this.getRequestUserId(req);
    if (
      !id ||
      !adminId ||
      id === user.id ||
      adminId === user.id ||
      adminId === id
    ) {
      throw new HttpException('Invalid user to switch to', 400);
    }

    const { kept, switched } = await this._userService.switchUser(
      user.id,
      id,
      adminId
    );

    await this._paymentService.syncCustomerEmailsAfterSwitch([kept, switched]);

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

  @Post('/personal')
  @UseGuards(SameOriginGuard)
  async changePersonal(
    @GetUserFromRequest() user: User,
    @Body() body: UserDetailDto
  ) {
    return this._userService.changePersonal(user.id, body);
  }

  @Get('/identities')
  async getIdentities(@GetUserFromRequest() user: User) {
    return this._userService.getIdentities(user.id);
  }

  @Post('/identities/:provider/link')
  @UseGuards(SameOriginGuard)
  async linkIdentity(
    @GetUserFromRequest() user: User,
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
    @RealIP() ip: string
  ) {
    this.assertNotImpersonating(req);
    if (!isLinkableProvider(provider)) {
      throw new HttpException('Unknown provider', 400);
    }
    await this.assertAbuse('identity_link', user.email, ip);

    const state = `link-${makeId(16)}`;
    const nonce = oauthLinkNonceFromState(state);
    if (!nonce) {
      throw new HttpException('Could not start the link session', 400);
    }
    const ticket = this._authService.oauthLinkTicket(user.id, nonce);
    response.cookie('oauth_state', state, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(areCookiesSecured()
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      expires: new Date(Date.now() + 1000 * 60 * 10),
    });
    response.cookie('oauth_link_user', ticket, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(areCookiesSecured()
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      expires: new Date(Date.now() + 1000 * 60 * 10),
    });

    const url = await this._authService.oauthLink(provider, { state });
    return { url };
  }

  @Delete('/identities/:provider')
  @UseGuards(SameOriginGuard)
  async unlinkIdentity(
    @GetUserFromRequest() user: User,
    @Param('provider') provider: string,
    @Req() req: Request,
    @RealIP() ip: string
  ) {
    this.assertNotImpersonating(req);
    await this.assertAbuse('identity_link', user.email, ip);
    return this._userService.unlinkIdentity(user.id, provider);
  }

  @Post('/password')
  @UseGuards(SameOriginGuard)
  async changePassword(
    @GetUserFromRequest() user: User,
    @Body() body: ChangePasswordDto,
    @Req() req: Request,
    @RealIP() ip: string
  ) {
    this.assertNotImpersonating(req);
    await this.assertAbuse('password_change', user.email, ip);
    return this._userService.changePassword(
      user.id,
      body,
      this.isStepUp(req, user.id)
    );
  }

  @Post('/email/request')
  @UseGuards(SameOriginGuard)
  async requestEmailChange(
    @GetUserFromRequest() user: User,
    @Body() body: RequestEmailChangeDto,
    @Req() req: Request,
    @RealIP() ip: string
  ) {
    this.assertNotImpersonating(req);
    await this.assertAbuse('email_change', user.email, ip);
    return this._userService.requestEmailChange(
      user.id,
      body.email,
      body.password,
      this.isStepUp(req, user.id)
    );
  }

  @Post('/email/confirm')
  @UseGuards(SameOriginGuard)
  async confirmEmailChange(
    @GetUserFromRequest() user: User,
    @Body() body: ConfirmEmailChangeDto,
    @Req() req: Request
  ) {
    this.assertNotImpersonating(req);
    return this._userService.confirmEmailChange(user.id, body.token);
  }

  private assertNotImpersonating(req: Request) {
    const impersonate = req.cookies.impersonate || req.headers.impersonate;
    if (impersonate) {
      throw new HttpException(
        'This action is not allowed while impersonating',
        400
      );
    }
  }

  private isStepUp(req: Request, userId: string) {
    const token =
      (req.cookies?.stepup as string | undefined) ||
      (req.headers.stepup as string | undefined);
    return this._authService.isFreshOauth(token, userId);
  }

  private async assertAbuse(
    action: 'password_change' | 'email_change' | 'identity_link',
    email: string,
    ip: string
  ) {
    const decision = await this._abuseGuardService.challenge({
      action,
      email,
      ip,
    });
    if (!decision.allow) {
      throw new HttpException('Too many requests, please try again later', 429);
    }
  }

  @Get('/email-notifications')
  async getEmailNotifications(@GetUserFromRequest() user: User) {
    return this._userService.getEmailNotifications(user.id);
  }

  @Post('/email-notifications')
  @UseGuards(SameOriginGuard)
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
    // Billing off: no subscription to report, whatever row is left.
    if (!isBillingEnabled()) {
      return { subscription: undefined };
    }

    const subscription = await this._paymentService.getSubscription(
      organization.id
    );

    if (!subscription) {
      return { subscription: undefined };
    }

    // Both facts live in Stripe and nowhere local, so without them the Billing
    // screen cannot tell that 50% off was accepted, or that the last renewal
    // was refused.
    const [discount, paymentFailed] = await Promise.all([
      this._stripeService.getActiveDiscount(organization.paymentId),
      this._stripeService.hasFailedPayment(organization.paymentId),
    ]);

    return { subscription, discount, paymentFailed };
  }

  @Get('/subscription/tiers')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async tiers() {
    return this._paymentService.getDefaultProvider('web').getPackages();
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
    // The organization switcher needs an id, a name and the member's role, and
    // that is all this returns. It used to hand back whole rows, so every
    // member — a USER included — received the public API key and Stripe
    // customer id of each organization they belong to, although /user/self
    // shows the key to admins only and the key acts as the organization's
    // super-admin on the public API.
    return (await this._orgService.getOrgsByUserId(user.id))
      .filter((f) => !f.users[0].disabled)
      .map(({ id, name, users }) => ({ id, name, users }));
  }

  @Post('/change-org')
  changeOrg(
    @Body('id') id: string,
    @Res({ passthrough: true }) response: Response
  ) {
    response.cookie('showorg', id, {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(areCookiesSecured()
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
          }
        : {}),
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });

    if (!areCookiesSecured()) {
      response.header('showorg', id);
    }

    response.status(200).send();
  }

  @Post('/delete-account')
  @UseGuards(SameOriginGuard)
  async deleteAccount(
    @GetUserFromRequest() user: User,
    @Body() body: DeleteAccountDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    this.assertNotImpersonating(req);

    await this._userService.confirmDeleteAccount(
      user.id,
      body.email,
      body.password,
      this.isStepUp(req, user.id)
    );

    // Cancel billing before scrubbing the account — once the account is
    // deleted there is no way to retry a failed cancellation
    const ownedOrgs = await this._userService.getOrgsToDeleteForAccount(
      user.id
    );

    for (const org of ownedOrgs) {
      try {
        await this._paymentService.cancelAllSubscriptions(org.id);
      } catch (err) {
        console.log(err);
        throw new HttpException(
          'Could not cancel your subscription, please try again or contact support',
          400
        );
      }
    }

    await this._userService.deleteAccount(user.id);

    return this.logout(response);
  }

  @Post('/logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.header('logout', 'true');
    response.cookie('auth', '', {
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
      ...(areCookiesSecured()
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
      ...(areCookiesSecured()
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
      ...(areCookiesSecured()
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
        ...(areCookiesSecured()
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
