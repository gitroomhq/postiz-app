import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface StatsParams {
  from: Date;
  to: Date;
  unknownOnly?: boolean;
  organizationId?: string;
  includeDeleted?: boolean;
}

export interface OrgActivityParams {
  from: Date;
  to: Date;
  organizationId: string;
  includeDeleted?: boolean;
}

// Unknown errors are stored as the serialized error payload, e.g.
// {..."message":"Unknown Error"...}. Matches `message LIKE '%"message":"Unknown Error"%'`.
const UNKNOWN_ERROR_TOKEN = '"message":"Unknown Error"';

interface PerSocial {
  provider: string;
  count: number;
}

interface PerState {
  state: string;
  count: number;
}

export interface OrgActivityResponse {
  from: string;
  to: string;
  organizationId: string;
  errors: { total: number; perSocial: PerSocial[] };
  posts: { total: number; perSocial: PerSocial[] };
  connectedInRange: { total: number; perSocial: PerSocial[] };
  channels: { total: number; perSocial: PerSocial[] };
  postsByState: PerState[];
  firstActivityAt: string | null;
  lastActivityAt: string | null;
}

export interface StatsResponse {
  from: string;
  to: string;
  errors: { total: number; perSocial: PerSocial[] };
  posts: { total: number; perSocial: PerSocial[] };
  connected: { total: number; perSocial: PerSocial[] };
  publishingAccounts: { total: number; perSocial: PerSocial[] };
  scheduledAccounts: { total: number; perSocial: PerSocial[] };
  publishingChannels: { total: number; perSocial: PerSocial[] };
  scheduledChannels: { total: number; perSocial: PerSocial[] };
  activeOrgsBySource: { total: number; perSocial: PerSocial[] };
}

const sortDesc = (list: PerSocial[]) =>
  list.sort((a, b) => b.count - a.count || a.provider.localeCompare(b.provider));

@Injectable()
export class AdminStatsRepository {
  constructor(
    private _post: PrismaRepository<'post'>,
    private _integration: PrismaRepository<'integration'>,
    private _errors: PrismaRepository<'errors'>
  ) {}

  private async errorStats(params: StatsParams) {
    const where: Prisma.ErrorsWhereInput = {
      createdAt: { gte: params.from, lte: params.to },
      ...(params.unknownOnly
        ? { message: { contains: UNKNOWN_ERROR_TOKEN } }
        : {}),
      ...(params.organizationId
        ? { organizationId: params.organizationId }
        : {}),
    };

    const [total, grouped] = await Promise.all([
      this._errors.model.errors.count({ where }),
      this._errors.model.errors.groupBy({
        by: ['platform'],
        where,
        _count: { _all: true },
      }),
    ]);

    return {
      total,
      perSocial: sortDesc(
        grouped.map((g) => ({
          provider: g.platform,
          count: g._count._all,
        }))
      ),
    };
  }

  private async postStats(params: StatsParams) {
    // Only count top-level posts (thread children share a parentPostId) so the
    // numbers match a "post published to a channel" rather than every fragment.
    const where: Prisma.PostWhereInput = {
      state: 'PUBLISHED',
      parentPostId: null,
      ...(params.includeDeleted ? {} : { deletedAt: null }),
      publishDate: { gte: params.from, lte: params.to },
      ...(params.organizationId
        ? { organizationId: params.organizationId }
        : {}),
    };

    const [total, grouped] = await Promise.all([
      this._post.model.post.count({ where }),
      this._post.model.post.groupBy({
        by: ['integrationId'],
        where,
        _count: { _all: true },
      }),
    ]);

    // groupBy can't reach into the integration relation, so resolve the
    // providerIdentifier for the integrations we saw and fold the counts.
    const integrationIds = grouped.map((g) => g.integrationId);
    const integrations = integrationIds.length
      ? await this._integration.model.integration.findMany({
          where: { id: { in: integrationIds } },
          select: { id: true, providerIdentifier: true },
        })
      : [];
    const providerById = new Map(
      integrations.map((i) => [i.id, i.providerIdentifier])
    );

    const byProvider = new Map<string, number>();
    for (const g of grouped) {
      const provider = providerById.get(g.integrationId) || 'unknown';
      byProvider.set(provider, (byProvider.get(provider) || 0) + g._count._all);
    }

    return {
      total,
      perSocial: sortDesc(
        [...byProvider.entries()].map(([provider, count]) => ({
          provider,
          count,
        }))
      ),
    };
  }

  // Distinct organizations with at least one top-level post in the range,
  // per provider and overall: "publishing" = already PUBLISHED, "scheduled" =
  // QUEUE or PUBLISHED (a published post was scheduled for that day too).
  // The totals are distinct across all providers combined, not a summation.
  private async accountStats(params: StatsParams) {
    const whereBase: Prisma.PostWhereInput = {
      parentPostId: null,
      deletedAt: null,
      publishDate: { gte: params.from, lte: params.to },
    };

    const [publishedGroups, scheduledGroups] = await Promise.all([
      this._post.model.post.groupBy({
        by: ['organizationId', 'integrationId'],
        where: { ...whereBase, state: 'PUBLISHED' },
      }),
      this._post.model.post.groupBy({
        by: ['organizationId', 'integrationId'],
        where: { ...whereBase, state: { in: ['QUEUE', 'PUBLISHED'] } },
      }),
    ]);

    const integrationIds = [
      ...new Set(
        [...publishedGroups, ...scheduledGroups].map((g) => g.integrationId)
      ),
    ];
    const integrations = integrationIds.length
      ? await this._integration.model.integration.findMany({
          where: { id: { in: integrationIds } },
          select: { id: true, providerIdentifier: true },
        })
      : [];
    const providerById = new Map(
      integrations.map((i) => [i.id, i.providerIdentifier])
    );

    const distinctOrgs = (
      groups: { organizationId: string; integrationId: string }[]
    ) => {
      const allOrgs = new Set<string>();
      const orgsByProvider = new Map<string, Set<string>>();
      for (const g of groups) {
        const provider = providerById.get(g.integrationId) || 'unknown';
        if (!orgsByProvider.has(provider)) {
          orgsByProvider.set(provider, new Set());
        }
        orgsByProvider.get(provider)!.add(g.organizationId);
        allOrgs.add(g.organizationId);
      }
      return {
        total: allOrgs.size,
        perSocial: sortDesc(
          [...orgsByProvider.entries()].map(([provider, orgs]) => ({
            provider,
            count: orgs.size,
          }))
        ),
      };
    };

    // Same idea per channel: distinct integrations regardless of which
    // organization owns them (a user with two TikTok channels counts twice).
    const distinctChannels = (
      groups: { organizationId: string; integrationId: string }[]
    ) => {
      const allChannels = new Set<string>();
      const channelsByProvider = new Map<string, Set<string>>();
      for (const g of groups) {
        const provider = providerById.get(g.integrationId) || 'unknown';
        if (!channelsByProvider.has(provider)) {
          channelsByProvider.set(provider, new Set());
        }
        channelsByProvider.get(provider)!.add(g.integrationId);
        allChannels.add(g.integrationId);
      }
      return {
        total: allChannels.size,
        perSocial: sortDesc(
          [...channelsByProvider.entries()].map(([provider, channels]) => ({
            provider,
            count: channels.size,
          }))
        ),
      };
    };

    return {
      publishingAccounts: distinctOrgs(publishedGroups),
      scheduledAccounts: distinctOrgs(scheduledGroups),
      publishingChannels: distinctChannels(publishedGroups),
      scheduledChannels: distinctChannels(scheduledGroups),
    };
  }

  // Distinct organizations with at least one top-level scheduled, published
  // or failed post in the range, per creation source (web, API, MCP, ...).
  // The total is distinct across all sources combined, not a summation.
  private async sourceStats(params: StatsParams) {
    const where: Prisma.PostWhereInput = {
      parentPostId: null,
      deletedAt: null,
      publishDate: { gte: params.from, lte: params.to },
      state: { in: ['QUEUE', 'PUBLISHED', 'ERROR'] },
    };

    const groups = await this._post.model.post.groupBy({
      by: ['organizationId', 'creationMethod'],
      where,
    });

    const allOrgs = new Set<string>();
    const orgsBySource = new Map<string, Set<string>>();
    for (const g of groups) {
      if (!orgsBySource.has(g.creationMethod)) {
        orgsBySource.set(g.creationMethod, new Set());
      }
      orgsBySource.get(g.creationMethod)!.add(g.organizationId);
      allOrgs.add(g.organizationId);
    }

    return {
      total: allOrgs.size,
      perSocial: sortDesc(
        [...orgsBySource.entries()].map(([provider, orgs]) => ({
          provider,
          count: orgs.size,
        }))
      ),
    };
  }

  private async connectedStats(params: StatsParams) {
    const where: Prisma.IntegrationWhereInput = {
      ...(params.includeDeleted ? {} : { deletedAt: null }),
      createdAt: { gte: params.from, lte: params.to },
      ...(params.organizationId
        ? { organizationId: params.organizationId }
        : {}),
    };

    const [total, grouped] = await Promise.all([
      this._integration.model.integration.count({ where }),
      this._integration.model.integration.groupBy({
        by: ['providerIdentifier'],
        where,
        _count: { _all: true },
      }),
    ]);

    return {
      total,
      perSocial: sortDesc(
        grouped.map((g) => ({
          provider: g.providerIdentifier,
          count: g._count._all,
        }))
      ),
    };
  }

  private async postStateStats(params: OrgActivityParams) {
    const grouped = await this._post.model.post.groupBy({
      by: ['state'],
      where: {
        organizationId: params.organizationId,
        parentPostId: null,
        ...(params.includeDeleted ? {} : { deletedAt: null }),
        publishDate: { gte: params.from, lte: params.to },
      },
      _count: { _all: true },
    });

    return grouped
      .map((g) => ({ state: g.state as string, count: g._count._all }))
      .sort((a, b) => b.count - a.count || a.state.localeCompare(b.state));
  }

  private async currentChannelStats(
    organizationId: string,
    includeDeleted?: boolean
  ) {
    const where: Prisma.IntegrationWhereInput = {
      organizationId,
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    const [total, grouped] = await Promise.all([
      this._integration.model.integration.count({ where }),
      this._integration.model.integration.groupBy({
        by: ['providerIdentifier'],
        where,
        _count: { _all: true },
      }),
    ]);

    return {
      total,
      perSocial: sortDesc(
        grouped.map((g) => ({
          provider: g.providerIdentifier,
          count: g._count._all,
        }))
      ),
    };
  }

  private async activityRange(
    organizationId: string,
    includeDeleted?: boolean
  ) {
    const { _min, _max } = await this._post.model.post.aggregate({
      where: {
        organizationId,
        state: 'PUBLISHED',
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      _min: { publishDate: true },
      _max: { publishDate: true },
    });

    return {
      firstActivityAt: _min.publishDate?.toISOString() || null,
      lastActivityAt: _max.publishDate?.toISOString() || null,
    };
  }

  async getOrgActivity(
    params: OrgActivityParams
  ): Promise<OrgActivityResponse> {
    const [errors, posts, connectedInRange, channels, postsByState, activity] =
      await Promise.all([
        this.errorStats(params),
        this.postStats(params),
        this.connectedStats(params),
        this.currentChannelStats(params.organizationId, params.includeDeleted),
        this.postStateStats(params),
        this.activityRange(params.organizationId, params.includeDeleted),
      ]);

    return {
      from: params.from.toISOString(),
      to: params.to.toISOString(),
      organizationId: params.organizationId,
      errors,
      posts,
      connectedInRange,
      channels,
      postsByState,
      ...activity,
    };
  }

  async getStats(params: StatsParams): Promise<StatsResponse> {
    const [errors, posts, accounts, connected, activeOrgsBySource] =
      await Promise.all([
        this.errorStats(params),
        this.postStats(params),
        this.accountStats(params),
        this.connectedStats(params),
        this.sourceStats(params),
      ]);

    return {
      from: params.from.toISOString(),
      to: params.to.toISOString(),
      errors,
      posts,
      connected,
      publishingAccounts: accounts.publishingAccounts,
      scheduledAccounts: accounts.scheduledAccounts,
      publishingChannels: accounts.publishingChannels,
      scheduledChannels: accounts.scheduledChannels,
      activeOrgsBySource,
    };
  }
}
