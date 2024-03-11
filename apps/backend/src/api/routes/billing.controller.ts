import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import {ApiTags} from "@nestjs/swagger";

@ApiTags('Billing')
@Controller('/billing')
export class BillingController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _stripeService: StripeService
  ) {}

  @Get('/check/:id')
  async checkId(
    @GetOrgFromRequest() org: Organization,
    @Param('id') body: string
  ) {
    return {
      exists: !!(await this._subscriptionService.checkSubscription(
        org.id,
        body
      )),
    };
  }

  @Post('/subscribe')
  subscribe(
    @GetOrgFromRequest() org: Organization,
    @Body() body: BillingSubscribeDto
  ) {
    return this._stripeService.subscribe(org.id, body);
  }

  @Get('/portal')
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
  cancel(@GetOrgFromRequest() org: Organization) {
    return this._stripeService.setToCancel(org.id);
  }

  @Post('/prorate')
  prorate(
      @GetOrgFromRequest() org: Organization,
      @Body() body: BillingSubscribeDto
  ) {
    return this._stripeService.prorate(org.id, body);
  }
}
