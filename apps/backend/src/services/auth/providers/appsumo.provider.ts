import {
  AuthProvider,
  AuthProviderAbstract,
} from '@gitroom/backend/services/auth/providers.interface';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

const APPSUMO_OPENID_BASE = 'https://appsumo.com/openid';

const APPSUMO_TIER_MAP: Record<number, 'STANDARD' | 'TEAM' | 'PRO'> = {
  1: 'STANDARD',
  2: 'TEAM',
  3: 'PRO',
};

@AuthProvider({ provider: 'APPSUMO' })
export class AppSumoProvider extends AuthProviderAbstract {
  constructor(private _subscriptionService: SubscriptionService) {
    super();
  }

  generateLink() {
    const params = new URLSearchParams({
      client_id: process.env.APPSUMO_CLIENT_ID!,
      redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/appsumo`,
      response_type: 'code',
      scope: 'openid',
    });

    return `${APPSUMO_OPENID_BASE}/authorize/?${params.toString()}`;
  }

  async getToken(code: string) {
    const clientId = process.env.APPSUMO_CLIENT_ID;
    const clientSecret = process.env.APPSUMO_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return '';
    }

    const tokenResponse = await fetch(`${APPSUMO_OPENID_BASE}/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${process.env.FRONTEND_URL}/settings`,
      }),
    });

    if (!tokenResponse.ok) {
      return '';
    }

    const { access_token } = await tokenResponse.json();
    return access_token || '';
  }

  async getUser(accessToken: string) {
    if (!accessToken) {
      return { id: '', email: '' };
    }

    const response = await fetch(
      `${APPSUMO_OPENID_BASE}/license_key/?access_token=${accessToken}`,
    );

    if (!response.ok) {
      return { id: '', email: '' };
    }

    const data = await response.json();
    if (!data.license_key) {
      return { id: '', email: '' };
    }

    return {
      id: String(`appsumo_${data.license_key}`),
      email: String(`appsumo_${data.license_key}`),
    };
  }

  async postRegistration(accessToken: string, orgId: string) {
    if (!accessToken) {
      return;
    }

    const response = await fetch(
      `${APPSUMO_OPENID_BASE}/license_key/?access_token=${accessToken}`,
    );

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    const billing = APPSUMO_TIER_MAP[data.tier] || 'STANDARD';

    await this._subscriptionService.createOrUpdateSubscription(
      false,
      data.license_key,
      data.license_key,
      pricing[billing].channel!,
      billing,
      'YEARLY',
      null,
      data.license_key,
      orgId
    );
  }
}
