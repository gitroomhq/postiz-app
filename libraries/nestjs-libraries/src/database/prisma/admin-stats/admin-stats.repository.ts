import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface StatsParams {
  from: Date;
  to: Date;
  unknownOnly?: boolean;
}

// Unknown errors are stored as the serialized error payload, e.g.
// {..."message":"Unknown Error"...}. Matches `message LIKE '%"message":"Unknown Error"%'`.
const UNKNOWN_ERROR_TOKEN = '"message":"Unknown Error"';

interface PerSocial {
  provider: string;
  count: number;
}

export interface StatsResponse {
  from: string;
  to: string;
  errors: { total: number; perSocial: PerSocial[] };
  posts: { total: number; perSocial: PerSocial[] };
  connected: { total: number; perSocial: PerSocial[] };
  publishingAccounts: { total: number; perSocial: PerSocial[] };
  scheduledAccounts: { total: number; perSocial: PerSocial[] };
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
      deletedAt: null,
      publishDate: { gte: params.from, lte: params.to },
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

    return {
      publishingAccounts: distinctOrgs(publishedGroups),
      scheduledAccounts: distinctOrgs(scheduledGroups),
    };
  }

  private async connectedStats(params: StatsParams) {
    const where: Prisma.IntegrationWhereInput = {
      deletedAt: null,
      createdAt: { gte: params.from, lte: params.to },
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

  async getStats(params: StatsParams): Promise<StatsResponse> {
    const [errors, posts, accounts, connected] = await Promise.all([
      this.errorStats(params),
      this.postStats(params),
      this.accountStats(params),
      this.connectedStats(params),
    ]);

    return {
      from: params.from.toISOString(),
      to: params.to.toISOString(),
      errors,
      posts,
      connected,
      publishingAccounts: accounts.publishingAccounts,
      scheduledAccounts: accounts.scheduledAccounts,
    };
  }
}
