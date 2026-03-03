import { HttpException, Injectable } from '@nestjs/common';
import crypto from 'crypto';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { Provider } from '@prisma/client';

const APPSUMO_TIER_MAP: Record<number, 'STANDARD' | 'TEAM' | 'PRO'> = {
  1: 'STANDARD',
  2: 'TEAM',
  3: 'PRO',
};

export interface AppSumoWebhookPayload {
  license_key: string;
  event:
    | 'purchase'
    | 'activate'
    | 'upgrade'
    | 'downgrade'
    | 'deactivate'
    | 'migrate';
  license_status: string;
  event_timestamp: number;
  created_at: number;
  tier: number;
  prev_license_key?: string;
  test?: boolean;
}

@Injectable()
export class AppSumoService {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _usersService: UsersService,
    private _organizationService: OrganizationService
  ) {}

  validateSignature(rawBody: Buffer, timestamp: string, signature: string) {
    const apiKey = process.env.APPSUMO_API_KEY;
    if (!apiKey) {
      throw new HttpException('AppSumo API key not configured', 500);
    }

    const message = timestamp + rawBody.toString();
    const expectedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(message)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      throw new HttpException('Invalid signature', 401);
    }
  }

  async handleWebhook(payload: AppSumoWebhookPayload) {
    if (payload.test) {
      return { success: true, event: payload.event };
    }

    switch (payload.event) {
      case 'activate':
        return this.handlePurchaseOrActivate(payload);
      case 'upgrade':
        return this.handleUpgradeOrDowngrade(payload);
      case 'downgrade':
        return this.handleUpgradeOrDowngrade(payload);
      case 'deactivate':
        return this.handleDeactivate(payload);
      default:
        return { success: true, event: payload.event };
    }
  }

  private async handlePurchaseOrActivate(payload: AppSumoWebhookPayload) {
    const orgId = await this.findOrgByLicenseKey(payload.license_key);

    if (!orgId) {
      return { success: true, event: payload.event };
    }

    const billing = APPSUMO_TIER_MAP[payload.tier] || 'STANDARD';
    await this._subscriptionService.createOrUpdateSubscription(
      false,
      payload.license_key,
      payload.license_key,
      pricing[billing].channel!,
      billing,
      'YEARLY',
      null,
      payload.license_key,
      orgId
    );

    return { success: true, event: payload.event };
  }

  private async findOrgByLicenseKey(licenseKey: string) {
    const subscription =
      await this._subscriptionService.getSubscriptionByIdentifier(licenseKey);

    if (subscription) {
      return subscription.organizationId;
    }

    const user = await this._usersService.getUserByProvider(
      `appsumo_${licenseKey}`,
      Provider.APPSUMO
    );

    if (!user) {
      return null;
    }

    const orgs = await this._organizationService.getOrgsByUserId(user.id);
    return orgs[0]?.id || null;
  }

  private async handleUpgradeOrDowngrade(payload: AppSumoWebhookPayload) {
    const identifier = payload.prev_license_key || payload.license_key;
    const subscription =
      await this._subscriptionService.getSubscriptionByIdentifier(identifier);

    if (subscription) {
      const billing = APPSUMO_TIER_MAP[payload.tier] || 'STANDARD';
      await this._subscriptionService.createOrUpdateSubscription(
        false,
        payload.license_key,
        payload.license_key,
        pricing[billing].channel!,
        billing,
        'YEARLY',
        null,
        payload.license_key,
        subscription.organizationId
      );
    }

    return { success: true, event: payload.event };
  }

  private async handleDeactivate(payload: AppSumoWebhookPayload) {
    const subscription =
      await this._subscriptionService.getSubscriptionByIdentifier(
        payload.license_key
      );

    if (subscription) {
      await this._subscriptionService.deleteSubscription(
        subscription.organization.paymentId
      );
    }

    return { success: true, event: payload.event };
  }
}
