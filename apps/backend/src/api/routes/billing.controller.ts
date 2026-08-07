import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization, User } from '@prisma/client';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import {
  lifetimeWindow,
  trialWindow,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { LifetimeDto } from '@gitroom/nestjs-libraries/dtos/billing/lifetime.dto';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { Request } from 'express';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';

@ApiTags('Billing')
@Controller('/billing')
export class BillingController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _stripeService: StripeService,
    private _notificationService: NotificationService,
    private _usersService: UsersService,
    private _organizationService: OrganizationService
  ) {}

  private async assertNoOtherSubscribedAccount(user: User) {
    const other = await this._usersService.getUserWithActiveSubscriptionByEmail(
      user.email,
      user.id
    );
    return !!other;
  }

  @Get('/check/:id')
  async checkId(
    @GetOrgFromRequest() org: Organization,
    @Param('id') body: string
  ) {
    return {
      status: await this._stripeService.checkSubscription(org.id, body),
    };
  }

  @Get('/check-discount')
  async checkDiscount(@GetOrgFromRequest() org: Organization) {
    return {
      offerCoupon: !(await this._stripeService.checkDiscount(org.paymentId))
        ? false
        : AuthService.signJWT({ discount: true }),
    };
  }

  @Post('/apply-discount')
  async applyDiscount(@GetOrgFromRequest() org: Organization) {
    await this._stripeService.applyDiscount(org.paymentId);
  }

  @Post('/apply-lifetime-retention')
  async applyLifetimeRetention(@GetOrgFromRequest() org: Organization) {
    return this._stripeService.applyLifetimeRetentionOffer(org.id);
  }

  @Post('/finish-trial')
  async finishTrial(@GetOrgFromRequest() org: Organization) {
    // Two ways a trial ends, and the caller polls `is-trial-finished` until the
    // organization's flag clears either way.
    //
    // When Stripe has a trialing subscription, ending it there is enough: the
    // webhook clears the flag. When it has none — a founding member, whose
    // entitlement is a local row and never a Stripe subscription — no webhook
    // is ever coming, so the flag is cleared here. Without this the caller
    // polled forever and the "End free trial" dialog never closed.
    //
    // Deferred founding purchases charge $49 here (force) before the flag
    // clears, so "End free trial" matches money the same way a Stripe
    // subscription trial does. If that charge fails (dead card), leave the
    // trial flag alone — clearing it would unlock a founding member who never
    // paid. The FinishTrial overlay keeps polling until money clears or the
    // window closes and settleFoundingLifetimeAfterTrial runs.
    //
    // The error is still swallowed, as before, so a Stripe outage cannot leave
    // somebody stuck in a dialog. But `ended: false` is not an error, and only
    // that specific answer clears the flag locally.
    let captureBlocked = false;
    let error: string | undefined;
    let status: string | undefined;
    try {
      const { ended } = await this._stripeService.finishTrial(org.paymentId);
      const capture = await this._stripeService.captureFoundingLifetimeIfDue(
        org.id,
        {
          force: true,
        }
      );
      captureBlocked = !!(
        ('error' in capture && capture.error) ||
        ('status' in capture && capture.status)
      );
      if ('error' in capture && capture.error) error = String(capture.error);
      if ('status' in capture && capture.status) status = String(capture.status);
      if (!ended && !captureBlocked) {
        await this._organizationService.endTrial(org.id);
      }
    } catch (err) {}
    return {
      finish: true,
      captureBlocked,
      ...(error ? { error } : {}),
      ...(status ? { status } : {}),
    };
  }

  @Get('/is-trial-finished')
  async isTrialFinished(@GetOrgFromRequest() org: Organization) {
    // Lazy capture when the derived trial window has already closed (no
    // finish-trial click). force:false so we never charge mid-trial.
    //
    // Use settleFoundingLifetimeAfterTrial (raw DB isTrailing) — the request
    // org's isTrailing is middleware-derived, so `org.isTrailing && !window`
    // was dead code and never cleared the row after natural expiry.
    let captureBlocked = false;
    let error: string | undefined;
    let status: string | undefined;
    try {
      const capture =
        await this._stripeService.settleFoundingLifetimeAfterTrial(org.id);
      captureBlocked = !!(
        ('error' in capture && capture.error) ||
        ('status' in capture && capture.status)
      );
      if ('error' in capture && capture.error) error = String(capture.error);
      if ('status' in capture && capture.status) status = String(capture.status);
    } catch (err) {}

    // Deferred founding still unpaid after the window — never report finished
    // (avoids false thank-you). Mid-trial owed alone is fine: finish-trial uses
    // force:true and surfaces captureBlocked on the POST itself.
    const windowOpen = trialWindow(org.createdAt).open;
    const owed = await this._stripeService.isDeferredFoundingFeeOwed(org.id);
    if (captureBlocked || (owed && !windowOpen)) {
      return {
        finished: false,
        captureBlocked: true,
        ...(error ? { error } : {}),
        ...(status ? { status } : {}),
      };
    }

    return {
      finished: !org.isTrailing || !windowOpen,
      captureBlocked: false,
    };
  }

  @Post('/embedded')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async embedded(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: BillingSubscribeDto,
    @Req() req: Request
  ) {
    if (await this.assertNoOtherSubscribedAccount(user)) {
      return { blocked: true };
    }

    const uniqueId = req?.cookies?.track;
    return this._stripeService.embedded(
      uniqueId,
      org.id,
      user.id,
      body,
      org.allowTrial
    );
  }

  @Post('/subscribe')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async subscribe(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: BillingSubscribeDto,
    @Req() req: Request
  ) {
    if (await this.assertNoOtherSubscribedAccount(user)) {
      return { blocked: true };
    }

    const uniqueId = req?.cookies?.track;
    return this._stripeService.subscribe(
      uniqueId,
      org.id,
      user.id,
      body,
      org.allowTrial
    );
  }

  @Get('/portal')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async modifyPayment(@GetOrgFromRequest() org: Organization) {
    const customer = await this._stripeService.getCustomerByOrganizationId(
      org.id
    );
    const { url } = await this._stripeService.createBillingPortalLink(customer);
    return {
      portal: url,
    };
  }

  @Get('/')
  getCurrentBilling(@GetOrgFromRequest() org: Organization) {
    return this._subscriptionService.getSubscriptionByOrganizationId(org.id);
  }

  @Post('/cancel')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async cancel(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: { feedback: string }
  ) {
    await this._notificationService.sendEmail(
      process.env.EMAIL_FROM_ADDRESS,
      'Subscription Cancelled',
      `Organization ${org.name} has cancelled their subscription because: ${body.feedback}`,
      user.email
    );

    return this._stripeService.setToCancel(org.id);
  }

  @Post('/prorate')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  prorate(
    @GetOrgFromRequest() org: Organization,
    @Body() body: BillingSubscribeDto
  ) {
    return this._stripeService.prorate(org.id, body);
  }

  @Get('/charges')
  async getCharges(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }

    return this._stripeService.getCharges(org.id);
  }

  @Post('/refund-charges')
  async refundCharges(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization,
    @Body() body: { chargeIds: string[] }
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }

    return this._stripeService.refundCharges(org.id, body.chargeIds);
  }

  @Post('/cancel-subscription')
  async cancelSubscription(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }

    return this._stripeService.cancelSubscription(org.id);
  }

  /**
   * These endpoints exist to back the Chatbase support agent's refund tool, but
   * they are ordinary authenticated routes: with the widget switched off they
   * were still reachable, letting any signed-in customer refund themselves and
   * cancel their own subscription over the API. Refuse unless the integration
   * that is meant to front them is actually configured.
   */
  private assertChatbaseEnabled() {
    if (!process.env.CHATBASE_TOKEN) {
      throw new HttpException('Not found', 404);
    }
  }

  @Get('/chatbase-refund/preview')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  chatbaseRefundPreview(@GetOrgFromRequest() org: Organization) {
    this.assertChatbaseEnabled();
    return this._stripeService.chatbaseRefundPreview(org.id);
  }

  @Post('/chatbase-refund')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async chatbaseRefund(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    this.assertChatbaseEnabled();

    const refund = await this._stripeService.chatbaseRefund(org.id);

    if (refund.refunded) {
      await this._notificationService.sendEmail(
        process.env.EMAIL_FROM_ADDRESS,
        'Refund issued from Chatbase',
        `Organization ${org.name} received a refund of ${refund.amount} ${refund.currency} and their subscription was cancelled`,
        user.email
      );
    }

    return refund;
  }

  @Post('/lifetime-checkout')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async lifetimeCheckout(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    const sub =
      await this._subscriptionService.getSubscriptionByOrganizationId(org.id);
    // Paid founding member: no second purchase. Lifetime-on-trial already converted.
    if (sub?.isLifetime && !org.isTrailing) {
      throw new HttpException(
        { success: false, message: 'Already a founding member.' },
        HttpStatus.CONFLICT
      );
    }
    if (sub?.isLifetime && org.isTrailing) {
      throw new HttpException(
        { success: false, message: 'Already on the founding-member trial.' },
        HttpStatus.CONFLICT
      );
    }
    // Trial convert (design): entire trial, not only the 24h founding window.
    // Founding window still covers free / non-trial signups on /billing/lifetime.
    const trialConvert = !!org.isTrailing;
    if (!trialConvert && !lifetimeWindow(user.createdAt).open) {
      throw new HttpException(
        { success: false, message: 'The founding-member offer has closed.' },
        HttpStatus.GONE
      );
    }

    return this._stripeService.createLifetimeCheckout(org);
  }

  @Post('/lifetime')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async lifetime(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization,
    @Body() body: LifetimeDto
  ) {
    // The founding-member offer closes 24 hours after registration, and the
    // screen draws a countdown to that moment. A countdown the server does not
    // enforce is decoration — the same lesson as the trial lock: the rule lives
    // where the money moves, or it is not a rule. Both sides read
    // `lifetimeWindow()` so they cannot drift.
    if (!lifetimeWindow(user.createdAt).open) {
      throw new HttpException(
        { success: false, message: 'The founding-member offer has closed.' },
        HttpStatus.GONE
      );
    }

    return this._stripeService.lifetimeDeal(org.id, body.code);
  }

  @Post('/add-subscription')
  async addSubscription(
    @Body() body: { subscription: string },
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    if (!user.isSuperAdmin) {
      throw new Error('Unauthorized');
    }

    await this._subscriptionService.addSubscription(
      org.id,
      user.id,
      body.subscription
    );
  }

}
