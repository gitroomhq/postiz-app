/**
 * Facebook Marketing API client (Graph v26.0 as of 2026-07-29).
 * Ads management only — does not post organically to Pages.
 */
import { BadRequestException, Injectable } from '@nestjs/common';

export const FACEBOOK_MARKETING_API_VERSION =
  process.env.FACEBOOK_MARKETING_API_VERSION || 'v26.0';

export const FACEBOOK_ADS_SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_ads',
] as const;

export const CAMPAIGN_OBJECTIVES = [
  'OUTCOME_AWARENESS',
  'OUTCOME_TRAFFIC',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_LEADS',
  'OUTCOME_SALES',
  'OUTCOME_APP_PROMOTION',
] as const;

export const OPTIMIZATION_GOALS = [
  'NONE',
  'REACH',
  'IMPRESSIONS',
  'LINK_CLICKS',
  'LANDING_PAGE_VIEWS',
  'POST_ENGAGEMENT',
  'PAGE_LIKES',
  'LEAD_GENERATION',
  'QUALITY_LEAD',
  'OFFSITE_CONVERSIONS',
  'VALUE',
  'CONVERSATIONS',
  'THRUPLAY',
  'AD_RECALL_LIFT',
  'ENGAGED_USERS',
  'EVENT_RESPONSES',
  'QUALITY_CALL',
  'PROFILE_VISIT',
  'PROFILE_AND_PAGE_ENGAGEMENT',
  'AUTOMATIC_OBJECTIVE',
  'APP_INSTALLS',
  'VISIT_INSTAGRAM_PROFILE',
  'ENGAGED_PAGE_VIEWS',
  'DERIVED_EVENTS',
  'APP_INSTALLS_AND_OFFSITE_CONVERSIONS',
  'IN_APP_VALUE',
  'MESSAGING_PURCHASE_CONVERSION',
  'MESSAGING_DEEP_CONVERSATION_AND_FOLLOW',
  'SUBSCRIBERS',
  'REMINDERS_SET',
  'MEANINGFUL_CALL_ATTEMPT',
  'MESSAGING_APPOINTMENT_CONVERSION',
  'ADVERTISER_SILOED_VALUE',
] as const;

export const BID_STRATEGIES = [
  'LOWEST_COST_WITHOUT_CAP',
  'LOWEST_COST_WITH_BID_CAP',
  'COST_CAP',
  'LOWEST_COST_WITH_MIN_ROAS',
] as const;

export const DESTINATION_TYPES = [
  'WEBSITE',
  'APP',
  'MESSENGER',
  'APPLINKS_AUTOMATIC',
  'WHATSAPP',
  'INSTAGRAM_DIRECT',
  'FACEBOOK',
  'ON_AD',
  'ON_POST',
  'ON_EVENT',
  'ON_VIDEO',
  'ON_PAGE',
  'INSTAGRAM_PROFILE',
  'FACEBOOK_PAGE',
  'INSTAGRAM_PROFILE_AND_FACEBOOK_PAGE',
  'SHOP_AUTOMATIC',
  'MESSAGING_MESSENGER_WHATSAPP',
  'MESSAGING_INSTAGRAM_DIRECT_MESSENGER',
  'MESSAGING_INSTAGRAM_DIRECT_MESSENGER_WHATSAPP',
  'MESSAGING_INSTAGRAM_DIRECT_WHATSAPP',
] as const;

export const BILLING_EVENTS = [
  'IMPRESSIONS',
  'LINK_CLICKS',
  'APP_INSTALLS',
  'PAGE_LIKES',
  'POST_ENGAGEMENT',
  'THRUPLAY',
  'PURCHASE',
  'LISTING_INTERACTION',
] as const;

type GraphPayload = Record<string, unknown>;

@Injectable()
export class FacebookAdsClient {
  graphVersion() {
    return FACEBOOK_MARKETING_API_VERSION.replace(/^\/?/, '');
  }

  graphUrl(path: string) {
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `https://graph.facebook.com/${this.graphVersion()}${clean}`;
  }

  adsRedirectUri() {
    const custom = process.env.FACEBOOK_ADS_REDIRECT_URI?.trim();
    if (custom) {
      return custom;
    }
    return `${process.env.FRONTEND_URL}/facebook-ads/callback`;
  }

  generateAuthUrl(state: string) {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID || '',
      redirect_uri: this.adsRedirectUri(),
      state,
      scope: FACEBOOK_ADS_SCOPES.join(','),
      response_type: 'code',
    });
    return `https://www.facebook.com/${this.graphVersion()}/dialog/oauth?${params.toString()}`;
  }

  async exchangeCode(code: string) {
    const token = await this.getJson<{ access_token?: string; error?: { message?: string } }>(
      this.graphUrl('/oauth/access_token') +
        `?client_id=${encodeURIComponent(process.env.FACEBOOK_APP_ID || '')}` +
        `&redirect_uri=${encodeURIComponent(this.adsRedirectUri())}` +
        `&client_secret=${encodeURIComponent(process.env.FACEBOOK_APP_SECRET || '')}` +
        `&code=${encodeURIComponent(code)}`
    );
    if (!token.access_token) {
      throw new BadRequestException(token.error?.message || 'Facebook did not return an ads access token');
    }

    const longLived = await this.getJson<{ access_token?: string; expires_in?: number }>(
      this.graphUrl('/oauth/access_token') +
        `?grant_type=fb_exchange_token` +
        `&client_id=${encodeURIComponent(process.env.FACEBOOK_APP_ID || '')}` +
        `&client_secret=${encodeURIComponent(process.env.FACEBOOK_APP_SECRET || '')}` +
        `&fb_exchange_token=${encodeURIComponent(token.access_token)}`
    );

    const accessToken = longLived.access_token || token.access_token;
    const me = await this.getJson<{ id: string; name: string }>(
      this.graphUrl('/me') + `?fields=id,name&access_token=${encodeURIComponent(accessToken)}`
    );

    return {
      accessToken,
      facebookUserId: me.id,
      name: me.name,
      expiresIn: longLived.expires_in || 60 * 60 * 24 * 59,
    };
  }

  async get<T = any>(token: string, path: string, params: Record<string, string> = {}) {
    const search = new URLSearchParams({ ...params, access_token: token });
    return this.getJson<T>(`${this.graphUrl(path)}?${search.toString()}`);
  }

  async post<T = any>(token: string, path: string, body: GraphPayload) {
    return this.sendJson<T>('POST', token, path, body);
  }

  async collectAll<T = any>(token: string, path: string, params: Record<string, string> = {}) {
    const items: T[] = [];
    let next: string | undefined =
      `${this.graphUrl(path)}?${new URLSearchParams({ ...params, access_token: token, limit: '100' }).toString()}`;
    while (next) {
      const page = await this.getJson<{ data?: T[]; paging?: { next?: string } }>(next);
      if (page.data?.length) {
        items.push(...page.data);
      }
      next = page.paging?.next;
    }
    return items;
  }

  private async sendJson<T>(method: string, token: string, path: string, body: GraphPayload) {
    const response = await fetch(this.graphUrl(path), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, access_token: token }),
    });
    return this.readJson<T>(response);
  }

  private async getJson<T>(url: string) {
    const response = await fetch(url);
    return this.readJson<T>(response);
  }

  private async readJson<T>(response: Response): Promise<T> {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || (payload as any)?.error) {
      const err = (payload as any)?.error || {};
      const message =
        err.error_user_msg ||
        err.message ||
        `Facebook Marketing API ${this.graphVersion()} request failed`;
      throw new BadRequestException(message);
    }
    return payload as T;
  }
}