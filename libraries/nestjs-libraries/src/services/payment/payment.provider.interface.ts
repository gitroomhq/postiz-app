import { HttpException, Injectable } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { AdminApplyCouponDto } from '@gitroom/nestjs-libraries/dtos/billing/admin.apply.coupon.dto';

export type PaymentPlatform = 'web' | 'mobile';

// Every billing use-case goes through this contract. Webhooks and `platform`
// are mandatory; everything else has a default that says "not supported on
// this platform" so a provider only implements what its platform offers
// (e.g. app stores have no hosted checkout / portal / coupons).
export abstract class PaymentProviderAbstract {
  // Where the subscription is bought / managed. An organization can only be
  // subscribed on one platform at a time, the other platform is blocked.
  abstract platform: PaymentPlatform;

  // Turn the raw webhook request into a trusted event (throw on bad signature / secret)
  abstract validateWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<any> | any;

  // Apply a validated webhook event to our subscriptions
  abstract processWebhook(event: any): Promise<any>;

  protected notSupported(): never {
    throw new HttpException(
      `This action is not supported on ${this.platform}`,
      400
    );
  }

  // --- subscription lifecycle -------------------------------------------

  // Client initiated re-check of the organization subscription against the
  // provider (mobile app after purchase / restore)
  async syncSubscription(organizationId: string): Promise<{ active: boolean }> {
    return this.notSupported();
  }

  // Hosted checkout page
  async subscribe(
    uniqueId: string,
    organizationId: string,
    userId: string,
    body: BillingSubscribeDto,
    allowTrial: boolean
  ): Promise<any> {
    return this.notSupported();
  }

  // Embedded checkout (client secret rendered inside our page)
  async embedded(
    uniqueId: string,
    organizationId: string,
    userId: string,
    body: BillingSubscribeDto,
    allowTrial: boolean
  ): Promise<any> {
    return this.notSupported();
  }

  // Price difference preview when switching plans
  async prorate(
    organizationId: string,
    body: BillingSubscribeDto
  ): Promise<any> {
    return this.notSupported();
  }

  // Toggle cancel-at-period-end
  async setToCancel(organizationId: string): Promise<any> {
    return this.notSupported();
  }

  // Cancel everything right now (account deletion). Must not throw when the
  // provider has nothing to cancel server side.
  async cancelAllSubscriptions(organizationId: string): Promise<any> {
    return this.notSupported();
  }

  // Self-service portal (payment method / invoices)
  async portalLink(organizationId: string): Promise<{ url: string }> {
    return this.notSupported();
  }

  // Post-checkout poll: is this subscription id active for the org
  async checkSubscription(
    organizationId: string,
    subscriptionId: string
  ): Promise<any> {
    return this.notSupported();
  }

  // Available plans / prices
  async getPackages(): Promise<any> {
    return this.notSupported();
  }

  // --- trial & discounts --------------------------------------------------

  async finishTrial(organization: Organization): Promise<any> {
    return this.notSupported();
  }

  async checkDiscount(organization: Organization): Promise<boolean> {
    return false;
  }

  async applyDiscount(organization: Organization): Promise<any> {
    return this.notSupported();
  }

  async lifetimeDeal(organizationId: string, code: string): Promise<any> {
    return this.notSupported();
  }

  // --- admin --------------------------------------------------------------

  async getCharges(organizationId: string): Promise<any> {
    return this.notSupported();
  }

  async refundCharges(
    organizationId: string,
    chargeIds: string[]
  ): Promise<any> {
    return this.notSupported();
  }

  async cancelSubscription(organizationId: string): Promise<any> {
    return this.notSupported();
  }

  async getCouponInfo(organizationId: string): Promise<any> {
    return this.notSupported();
  }

  async applyCoupon(
    organizationId: string,
    body: AdminApplyCouponDto
  ): Promise<any> {
    return this.notSupported();
  }

  async cancelCoupon(organizationId: string): Promise<any> {
    return this.notSupported();
  }

  async chatbaseRefundPreview(organizationId: string): Promise<any> {
    return this.notSupported();
  }

  async chatbaseRefund(
    organizationId: string
  ): Promise<{ refunded: boolean; amount?: number; currency?: string }> {
    return this.notSupported();
  }

  // After a login swap, keep the provider's customer email in sync (no-op by default)
  async syncCustomerEmailsAfterSwitch(
    accounts: { id: string; email: string }[]
  ): Promise<void> {}
}

export interface PaymentProviderParams {
  provider: string;
}

export function PaymentProvider(params: PaymentProviderParams) {
  return function (target: any) {
    Injectable()(target);

    const existingMetadata =
      Reflect.getMetadata('payment-provider', PaymentProviderAbstract) || [];

    existingMetadata.push({ target, provider: params.provider });

    Reflect.defineMetadata(
      'payment-provider',
      existingMetadata,
      PaymentProviderAbstract
    );
  };
}
