import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import {
  BID_STRATEGIES,
  BILLING_EVENTS,
  CAMPAIGN_OBJECTIVES,
  DESTINATION_TYPES,
  FACEBOOK_ADS_SCOPES,
  FACEBOOK_MARKETING_API_VERSION,
  FacebookAdsClient,
  OPTIMIZATION_GOALS,
} from '@gitroom/nestjs-libraries/integrations/facebook-ads/facebook.ads.client';
import {
  CreateFacebookAdDto,
  CreateFacebookAdGroupDto,
  CreateFacebookCampaignDto,
  SelectFacebookAdsContextDto,
} from '@gitroom/nestjs-libraries/dtos/facebook-ads/facebook.ads.dto';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';

@Injectable()
export class FacebookAdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: FacebookAdsClient
  ) {}

  catalog() {
    return {
      graphVersion: this.client.graphVersion(),
      scopes: FACEBOOK_ADS_SCOPES,
      campaignObjectives: CAMPAIGN_OBJECTIVES.map((value) => ({
        value,
        label: this.humanize(value),
      })),
      optimizationGoals: OPTIMIZATION_GOALS.map((value) => ({
        value,
        label: this.humanize(value),
        field: 'optimization_goal',
      })),
      bidStrategies: BID_STRATEGIES.map((value) => ({
        value,
        label: this.bidLabel(value),
        field: 'bid_strategy',
      })),
      destinationTypes: DESTINATION_TYPES.map((value) => ({
        value,
        label: this.humanize(value),
        field: 'destination_type',
      })),
      billingEvents: BILLING_EVENTS.map((value) => ({
        value,
        label: this.humanize(value),
        field: 'billing_event',
      })),
    };
  }

  authUrl() {
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      throw new BadRequestException(
        'FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be set to connect Facebook Ads'
      );
    }
    const state = makeId(12);
    return { url: this.client.generateAuthUrl(state), state };
  }

  async connect(organizationId: string, code: string) {
    const exchanged = await this.client.exchangeCode(code);
    const tokenExpiration = dayjs().add(exchanged.expiresIn, 'second').toDate();
    const existing = await this.prisma.facebookAdsConnection.findFirst({
      where: { organizationId },
    });
    const data = {
      facebookUserId: exchanged.facebookUserId,
      name: exchanged.name,
      accessToken: exchanged.accessToken,
      tokenExpiration,
    };
    const connection = existing
      ? await this.prisma.facebookAdsConnection.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.facebookAdsConnection.create({
          data: { organizationId, ...data },
        });
    return this.publicConnection(connection);
  }

  async status(organizationId: string) {
    const connection = await this.requireConnection(organizationId, false);
    return {
      connected: !!connection,
      graphVersion: this.client.graphVersion(),
      connection: connection ? this.publicConnection(connection) : null,
    };
  }

  async listBusinesses(organizationId: string) {
    const { token } = await this.requireConnection(organizationId);
    const owned = await this.client.collectAll(token, '/me/businesses', {
      fields: 'id,name',
    });
    return { businesses: owned };
  }

  async listAdAccounts(organizationId: string, businessId?: string) {
    const { token } = await this.requireConnection(organizationId);
    if (businessId) {
      const [owned, clientAccounts] = await Promise.all([
        this.client.collectAll(token, `/${businessId}/owned_ad_accounts`, {
          fields: 'id,name,account_id,currency,account_status,timezone_name',
        }),
        this.client.collectAll(token, `/${businessId}/client_ad_accounts`, {
          fields: 'id,name,account_id,currency,account_status,timezone_name',
        }),
      ]);
      return {
        adAccounts: this.uniqById([
          ...owned.map((row) => ({ ...row, source: 'owned' })),
          ...clientAccounts.map((row) => ({ ...row, source: 'client' })),
        ]),
      };
    }
    const mine = await this.client.collectAll(token, '/me/adaccounts', {
      fields: 'id,name,account_id,currency,account_status,timezone_name,business',
    });
    return { adAccounts: mine };
  }

  async selectContext(organizationId: string, body: SelectFacebookAdsContextDto) {
    const connection = await this.requireConnection(organizationId, true);
    const adAccountId = this.normalizeActId(body.adAccountId);
    const updated = await this.prisma.facebookAdsConnection.update({
      where: { id: connection.id },
      data: {
        selectedBusinessId: body.businessId || null,
        selectedAdAccountId: adAccountId,
      },
    });
    return this.publicConnection(updated);
  }

  async listPages(organizationId: string) {
    const { token } = await this.requireConnection(organizationId);
    const pages = await this.client.collectAll(token, '/me/accounts', {
      fields: 'id,name',
    });
    return { pages };
  }

  async listCampaigns(organizationId: string) {
    const { token, actId } = await this.requireAdAccount(organizationId);
    const campaigns = await this.client.collectAll(token, `/${actId}/campaigns`, {
      fields: 'id,name,objective,status,effective_status,daily_budget,lifetime_budget',
    });
    return { campaigns };
  }

  async createCampaign(organizationId: string, body: CreateFacebookCampaignDto) {
    const { token, actId } = await this.requireAdAccount(organizationId);
    const created = await this.client.post(token, `/${actId}/campaigns`, {
      name: body.name,
      objective: body.objective,
      status: body.status || 'PAUSED',
      special_ad_categories: [],
    });
    return created;
  }

  async listAdGroups(organizationId: string) {
    const { token, actId } = await this.requireAdAccount(organizationId);
    const adSets = await this.client.collectAll(token, `/${actId}/adsets`, {
      fields:
        'id,name,campaign_id,status,effective_status,optimization_goal,bid_strategy,destination_type,billing_event,daily_budget,lifetime_budget,targeting',
    });
    return { adGroups: adSets };
  }

  async createAdGroup(organizationId: string, body: CreateFacebookAdGroupDto) {
    const { token, actId } = await this.requireAdAccount(organizationId);
    const country = (body.country || 'IN').toUpperCase();
    const payload: Record<string, unknown> = {
      name: body.name,
      campaign_id: body.campaignId,
      billing_event: body.billingEvent || 'IMPRESSIONS',
      optimization_goal: body.optimizationGoal,
      bid_strategy: body.bidStrategy,
      destination_type: body.destinationType,
      daily_budget: Math.round(body.dailyBudget),
      targeting: JSON.stringify({
        geo_locations: { countries: [country] },
      }),
      status: body.status || 'PAUSED',
      start_time: dayjs().toISOString(),
    };
    if (
      body.bidAmount &&
      (body.bidStrategy === 'LOWEST_COST_WITH_BID_CAP' ||
        body.bidStrategy === 'COST_CAP')
    ) {
      payload.bid_amount = Math.round(body.bidAmount);
    }
    const created = await this.client.post(token, `/${actId}/adsets`, payload);
    return created;
  }

  async listAds(organizationId: string) {
    const { token, actId } = await this.requireAdAccount(organizationId);
    const ads = await this.client.collectAll(token, `/${actId}/ads`, {
      fields: 'id,name,adset_id,status,effective_status,creative{id,name}',
    });
    return { ads };
  }

  async createAd(organizationId: string, body: CreateFacebookAdDto) {
    const { token, actId } = await this.requireAdAccount(organizationId);
    const linkData: Record<string, unknown> = {
      link: body.link,
      message: body.message,
    };
    if (body.headline) {
      linkData.name = body.headline;
    }
    if (body.description) {
      linkData.description = body.description;
    }
    if (body.imageUrl) {
      const uploaded = await this.client.post<{ images?: Record<string, { hash?: string }> }>(
        token,
        `/${actId}/adimages`,
        { url: body.imageUrl }
      );
      const hash = Object.values(uploaded.images || {})[0]?.hash;
      if (hash) {
        linkData.image_hash = hash;
      } else {
        linkData.picture = body.imageUrl;
      }
    }

    const creative = await this.client.post<{ id: string }>(token, `/${actId}/adcreatives`, {
      name: `${body.name} creative`,
      object_story_spec: {
        page_id: body.pageId,
        link_data: linkData,
      },
    });

    const ad = await this.client.post(token, `/${actId}/ads`, {
      name: body.name,
      adset_id: body.adGroupId,
      creative: { creative_id: creative.id },
      status: body.status || 'PAUSED',
    });
    return { ...ad, creative_id: creative.id };
  }

  private async requireConnection(organizationId: string, required: true): Promise<any>;
  private async requireConnection(organizationId: string, required?: boolean): Promise<any>;
  private async requireConnection(organizationId: string, required = true) {
    const connection = await this.prisma.facebookAdsConnection.findFirst({
      where: { organizationId },
    });
    if (!connection && required) {
      throw new NotFoundException('Connect a Facebook Business Manager first');
    }
    return connection;
  }

  private async requireAdAccount(organizationId: string) {
    const connection = await this.requireConnection(organizationId, true);
    if (!connection.selectedAdAccountId) {
      throw new BadRequestException('Select a Facebook ad account first');
    }
    return {
      token: connection.accessToken,
      actId: this.normalizeActId(connection.selectedAdAccountId),
      connection,
    };
  }

  private normalizeActId(id: string) {
    const raw = String(id || '').replace(/^act_/, '');
    if (!raw) {
      throw new BadRequestException('Ad account id is required');
    }
    return `act_${raw}`;
  }

  private publicConnection(connection: any) {
    return {
      id: connection.id,
      facebookUserId: connection.facebookUserId,
      name: connection.name,
      selectedBusinessId: connection.selectedBusinessId,
      selectedAdAccountId: connection.selectedAdAccountId,
      tokenExpiration: connection.tokenExpiration,
      graphVersion: FACEBOOK_MARKETING_API_VERSION,
    };
  }

  private uniqById(rows: Array<{ id?: string }>) {
    const seen = new Set<string>();
    return rows.filter((row) => {
      if (!row.id || seen.has(row.id)) {
        return false;
      }
      seen.add(row.id);
      return true;
    });
  }

  private humanize(value: string) {
    return value
      .replace(/^OUTCOME_/, '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private bidLabel(value: string) {
    switch (value) {
      case 'LOWEST_COST_WITHOUT_CAP':
        return 'Highest volume (lowest cost, no cap)';
      case 'LOWEST_COST_WITH_BID_CAP':
        return 'Highest volume with bid cap';
      case 'COST_CAP':
        return 'Cost cap';
      case 'LOWEST_COST_WITH_MIN_ROAS':
        return 'Highest value with minimum ROAS';
      default:
        return this.humanize(value);
    }
  }
}