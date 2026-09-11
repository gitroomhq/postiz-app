import { HttpException, Injectable } from '@nestjs/common';
import { PaymentProviderManager } from '@gitroom/nestjs-libraries/services/payment/payment.provider.manager';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { PaymentPlatform } from '@gitroom/nestjs-libraries/services/payment/payment.provider.interface';

@Injectable()
export class PaymentService {
  constructor(
    private _paymentProviderManager: PaymentProviderManager,
    private _subscriptionService: SubscriptionService
  ) {}

  async webhook(
    provider: string,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ) {
    const paymentProvider = this._paymentProviderManager.getProvider(provider);
    const event = await paymentProvider.validateWebhook(rawBody, headers);
    return paymentProvider.processWebhook(event);
  }

  syncSubscription(provider: string, organizationId: string) {
    return this._paymentProviderManager
      .getProvider(provider)
      .syncSubscription(organizationId);
  }

  getDefaultProvider(platform: PaymentPlatform) {
    return this._paymentProviderManager.getDefaultProvider(platform).provider;
  }

  getDefaultProviderName(platform: PaymentPlatform) {
    return this._paymentProviderManager.getDefaultProvider(platform).name;
  }

  // Subscription row + the platform (web / mobile) of the provider that owns it,
  // so clients can tell the user where to manage the subscription.
  async getSubscription(organizationId: string) {
    const subscription =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );
    if (!subscription) {
      return null;
    }

    // A dangling provider name (provider removed from the build) must not
    // break reading the subscription
    let platform: PaymentPlatform | undefined;
    try {
      platform = this._paymentProviderManager.getProvider(
        subscription.provider
      ).platform;
    } catch (err) {
      platform = undefined;
    }

    return {
      ...subscription,
      platform,
    };
  }

  // The provider that handles billing actions for this organization on the
  // given platform: the one owning the current subscription, otherwise the
  // platform default. Throws when the subscription lives on another platform.
  async getProviderForOrganization(
    organizationId: string,
    platform: PaymentPlatform
  ) {
    const subscription =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );

    if (!subscription) {
      return this._paymentProviderManager.getDefaultProvider(platform).provider;
    }

    const current = this._paymentProviderManager.getProvider(
      subscription.provider
    );
    if (current.platform !== platform) {
      throw new HttpException(
        `Your subscription is managed on ${current.platform}, please use ${current.platform} to manage it`,
        400
      );
    }

    return current;
  }

  // An organization subscribed through one provider cannot checkout, sync or
  // manage the subscription through another one.
  async assertCanUseProvider(organizationId: string, provider: string) {
    const subscription =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );

    if (!subscription || subscription.provider === provider) {
      return;
    }

    const current = this._paymentProviderManager.getProvider(
      subscription.provider
    );
    const requested = this._paymentProviderManager.getProvider(provider);

    throw new HttpException(
      current.platform !== requested.platform
        ? `Your subscription is managed on ${current.platform}, please use ${current.platform} to manage it`
        : `Your subscription is managed by ${subscription.provider}`,
      400
    );
  }

  // Account deletion: the provider owning the org's subscription, or - when
  // there is no row (missed webhook, cleaned up) - every provider, so nothing
  // keeps charging a deleted account. Providers no-op when they own nothing.
  async cancelAllSubscriptions(organizationId: string) {
    const subscription =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );

    if (subscription) {
      return this._paymentProviderManager
        .getProvider(subscription.provider)
        .cancelAllSubscriptions(organizationId);
    }

    for (const { provider } of this._paymentProviderManager.getProviders()) {
      await provider.cancelAllSubscriptions(organizationId);
    }
  }

  async syncCustomerEmailsAfterSwitch(
    accounts: { id: string; email: string }[]
  ) {
    for (const { provider } of this._paymentProviderManager.getProviders()) {
      await provider.syncCustomerEmailsAfterSwitch(accounts);
    }
  }
}
