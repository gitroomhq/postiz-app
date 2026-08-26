import { HttpException } from '@nestjs/common';
import dayjs from 'dayjs';
import { uniq } from 'lodash';
import {
  PaymentPlatform,
  PaymentProvider,
  PaymentProviderAbstract,
} from '@gitroom/nestjs-libraries/services/payment/payment.provider.interface';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

import { REVENUECAT_PROVIDER } from '@gitroom/nestjs-libraries/services/payment/payment.providers';

interface RevenueCatSubscription {
  expires_date: string | null;
  purchase_date: string;
  original_purchase_date: string;
  unsubscribe_detected_at: string | null;
  billing_issues_detected_at: string | null;
  is_sandbox: boolean;
  store: string;
  period_type: string;
}

// RevenueCat is the source of truth for App Store / Google Play subscriptions.
// The webhook and the app only tell us *which* subscriber to re-check; we always
// load the subscriber from the API instead of trusting the event payload.
// app_user_id === Postiz organization id (the app calls Purchases.logIn(orgId)).
// Product ids end with <tier>.<period> or <tier>_<period>, e.g. com.postiz.mob.pro.yearly
@PaymentProvider({ provider: REVENUECAT_PROVIDER })
export class RevenueCatProvider extends PaymentProviderAbstract {
  platform: PaymentPlatform = 'mobile';

  constructor(
    private _subscriptionService: SubscriptionService,
    private _organizationService: OrganizationService
  ) {
    super();
  }

  validateWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ) {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!secret || headers.authorization !== secret) {
      throw new HttpException('Invalid webhook authorization', 401);
    }

    return JSON.parse(rawBody.toString('utf8'));
  }

  async processWebhook(body: any) {
    const event = body?.event;
    if (!event || event.type === 'TEST') {
      return { ok: true };
    }

    const organizations = uniq(
      [
        event.app_user_id,
        event.original_app_user_id,
        event.transferred_from,
        event.transferred_to,
      ]
        .flat()
        .filter((p: string) => p && !p.startsWith('$RCAnonymousID:'))
    ) as string[];

    for (const organizationId of organizations) {
      await this.syncSubscription(organizationId);
    }

    return { ok: true };
  }

  // Store subscriptions can only be cancelled by the user in the App Store /
  // Google Play; account deletion must not be blocked by it.
  override async cancelAllSubscriptions(organizationId: string) {
    return;
  }

  override async syncSubscription(organizationId: string) {
    const organization = await this._organizationService.getOrgById(
      organizationId
    );
    if (!organization) {
      return { active: false };
    }

    const active = await this.getActiveSubscription(organizationId);
    if (!active) {
      await this._subscriptionService.deleteSubscriptionByOrgId(
        organizationId,
        REVENUECAT_PROVIDER
      );
      return { active: false };
    }

    const { billing, period } = this.parseProductId(active.productId);

    // Store trials (intro offers) keep the same trial restrictions as a Stripe trial
    await this._subscriptionService.createOrUpdateSubscriptionByOrg(
      active.subscription.period_type === 'trial',
      organizationId,
      REVENUECAT_PROVIDER,
      active.productId,
      pricing[billing].channel!,
      billing,
      period,
      active.subscription.unsubscribe_detected_at &&
        active.subscription.expires_date
        ? dayjs(active.subscription.expires_date).unix()
        : null
    );

    return { active: true };
  }

  private async getActiveSubscription(organizationId: string) {
    if (!process.env.REVENUECAT_SECRET_KEY) {
      throw new HttpException('RevenueCat is not configured', 400);
    }

    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(
        organizationId
      )}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new HttpException(
        `RevenueCat subscriber request failed (${response.status})`,
        500
      );
    }

    const { subscriber } = await response.json();
    const subscriptions: Record<string, RevenueCatSubscription> =
      subscriber?.subscriptions || {};

    const rejectSandbox = !!process.env.IN_APP_PURCHASE_REJECT_SANDBOX;

    return Object.entries(subscriptions)
      .map(([productId, subscription]) => ({ productId, subscription }))
      .filter(
        ({ subscription }) =>
          (!rejectSandbox || !subscription.is_sandbox) &&
          (!subscription.expires_date ||
            dayjs(subscription.expires_date).isAfter(dayjs()))
      )
      .sort((a, b) =>
        dayjs(b.subscription.expires_date || '2999-01-01').diff(
          dayjs(a.subscription.expires_date || '2999-01-01')
        )
      )[0];
  }

  private parseProductId(productId: string) {
    const parts = productId.split(/[._]/);
    const period = (parts.pop() || '').toUpperCase();
    const billing = (parts.pop() || '').toUpperCase();

    if (
      !['MONTHLY', 'YEARLY'].includes(period) ||
      !['STANDARD', 'TEAM', 'PRO', 'ULTIMATE'].includes(billing)
    ) {
      throw new HttpException(
        `Unknown RevenueCat product identifier: ${productId}`,
        400
      );
    }

    return {
      billing: billing as 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE',
      period: period as 'MONTHLY' | 'YEARLY',
    };
  }
}
