import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization, User } from '@prisma/client';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { AdminApplyCouponDto } from '@gitroom/nestjs-libraries/dtos/billing/admin.apply.coupon.dto';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { Request } from 'express';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { PaymentService } from '@gitroom/nestjs-libraries/services/payment/payment.service';
import { BillingSyncDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.sync.dto';

@ApiTags('Billing')
@Controller('/billing')
export class BillingController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _notificationService: NotificationService,
    private _usersService: UsersService,
    private _paymentService: PaymentService
  ) {}

  // Billing routes are the web platform; the org's own provider (or the web
  // default when it has none) handles the action.
  private provider(org: Organization) {
    return this._paymentService.getProviderForOrganization(org.id, 'web');
  }

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
      status: await (await this.provider(org)).checkSubscription(org.id, body),
    };
  }

  @Get('/check-discount')
  async checkDiscount(@GetOrgFromRequest() org: Organization) {
    return {
      offerCoupon: !(await (await this.provider(org)).checkDiscount(org))
        ? false
        : AuthService.signJWT({ discount: true }),
    };
  }

  @Post('/apply-discount')
  async applyDiscount(@GetOrgFromRequest() org: Organization) {
    await (await this.provider(org)).applyDiscount(org);
  }

  @Post('/finish-trial')
  async finishTrial(@GetOrgFromRequest() org: Organization) {
    const provider = await this.provider(org);
    try {
      await provider.finishTrial(org);
    } catch (err) {}
    return {
      finish: true,
    };
  }

  @Get('/is-trial-finished')
  async isTrialFinished(@GetOrgFromRequest() org: Organization) {
    return {
      finished: !org.isTrailing,
    };
  }

  @Post('/embedded')
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
    return (await this.provider(org)).embedded(
      uniqueId,
      org.id,
      user.id,
      body,
      org.allowTrial
    );
  }

  @Post('/subscribe')
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
    return (await this.provider(org)).subscribe(
      uniqueId,
      org.id,
      user.id,
      body,
      org.allowTrial
    );
  }

  @Post('/sync')
  async sync(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: BillingSyncDto
  ) {
    if (await this.assertNoOtherSubscribedAccount(user)) {
      return { blocked: true };
    }
    await this._paymentService.assertCanUseProvider(org.id, body.provider);

    try {
      return await this._paymentService.syncSubscription(body.provider, org.id);
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      throw new HttpException((e as Error)?.message || 'Sync failed', 400);
    }
  }

  @Get('/portal')
  async modifyPayment(@GetOrgFromRequest() org: Organization) {
    const { url } = await (await this.provider(org)).portalLink(org.id);
    return {
      portal: url,
    };
  }

  @Get('/')
  getCurrentBilling(@GetOrgFromRequest() org: Organization) {
    return this._paymentService.getSubscription(org.id);
  }

  @Post('/cancel')
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

    return (await this.provider(org)).setToCancel(org.id);
  }

  @Post('/prorate')
  async prorate(
    @GetOrgFromRequest() org: Organization,
    @Body() body: BillingSubscribeDto
  ) {
    return (await this.provider(org)).prorate(org.id, body);
  }

  @Get('/charges')
  async getCharges(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }

    return (await this.provider(org)).getCharges(org.id);
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

    return (await this.provider(org)).refundCharges(org.id, body.chargeIds);
  }

  @Post('/cancel-subscription')
  async cancelSubscription(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }

    return (await this.provider(org)).cancelSubscription(org.id);
  }

  @Get('/coupon-info')
  async couponInfo(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }

    return (await this.provider(org)).getCouponInfo(org.id);
  }

  @Post('/apply-coupon')
  async applyCoupon(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization,
    @Body() body: AdminApplyCouponDto
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }

    return (await this.provider(org)).applyCoupon(org.id, body);
  }

  @Post('/cancel-coupon')
  async cancelCoupon(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }

    return (await this.provider(org)).cancelCoupon(org.id);
  }

  @Get('/chatbase-refund/preview')
  async chatbaseRefundPreview(@GetOrgFromRequest() org: Organization) {
    return (await this.provider(org)).chatbaseRefundPreview(org.id);
  }

  @Post('/chatbase-refund')
  async chatbaseRefund(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    const refund = await (await this.provider(org)).chatbaseRefund(org.id);

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
      body.subscription,
      this._paymentService.getDefaultProviderName('web')
    );
  }
}
