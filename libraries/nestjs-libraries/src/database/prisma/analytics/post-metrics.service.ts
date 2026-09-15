import { Injectable, Logger } from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { TemporalService } from 'nestjs-temporal-core';
import { State } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { PostMetricsRepository } from '@gitroom/nestjs-libraries/database/prisma/analytics/post-metrics.repository';
import {
  ANALYTICS_AGENT_NOTES,
  AnalyticsPostRow,
  mapSnapshotRow,
  matchesAnalyticsQuery,
  sortAnalyticsPosts,
  sumKnown,
  toAgentPost,
} from '@gitroom/nestjs-libraries/database/prisma/analytics/post-metrics.query';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { RefreshIntegrationService } from '@gitroom/nestjs-libraries/integrations/refresh.integration.service';
import { RefreshToken } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { GetAnalyticsPostsDto } from '@gitroom/nestjs-libraries/dtos/analytics/get.analytics.posts.dto';
import { timer } from '@gitroom/helpers/utils/timer';

dayjs.extend(utc);

const LOOKBACK_DAYS = 90;
const STALE_AFTER_MS = 60 * 60 * 1000;

export { ANALYTICS_AGENT_NOTES, toAgentPost };
export type { AnalyticsPostRow };

@Injectable()
export class PostMetricsService {
  private readonly logger = new Logger(PostMetricsService.name);

  constructor(
    private _repository: PostMetricsRepository,
    private _integrationManager: IntegrationManager,
    private _refreshIntegrationService: RefreshIntegrationService,
    private _temporalService: TemporalService
  ) {}

  listIntegrationsNeedingSync(organizationId?: string) {
    return this._repository.listIntegrationsNeedingSync(
      LOOKBACK_DAYS,
      organizationId
    );
  }

  async enqueueOrgSync(organizationId: string) {
    try {
      await this._temporalService.client.getRawClient()?.workflow.start(
        'analyticsSyncOrgWorkflowV1',
        {
          workflowId: `analytics-sync-org-v1-${organizationId}`,
          taskQueue: 'main',
          args: [{ organizationId }],
        }
      );
      return true;
    } catch (err) {
      // Already running is the expected case when the page is opened twice.
      return false;
    }
  }

  async maybeEnqueueStaleSync(organizationId: string) {
    const latest = await this._repository.latestSnapshotTime(organizationId);
    if (
      latest?.capturedAt &&
      Date.now() - latest.capturedAt.getTime() < STALE_AFTER_MS
    ) {
      return { syncing: false };
    }
    const started = await this.enqueueOrgSync(organizationId);
    return { syncing: true, started };
  }

  async syncIntegration(organizationId: string, integrationId: string) {
    const integration = await this._repository.getIntegration(
      organizationId,
      integrationId
    );
    if (
      !integration ||
      integration.disabled ||
      integration.refreshNeeded ||
      integration.inBetweenSteps
    ) {
      return { synced: 0 };
    }

    const provider = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );
    if (!provider?.postsAnalytics) {
      return { synced: 0 };
    }
    if (
      integration.providerIdentifier === 'x' &&
      process.env.DISABLE_X_ANALYTICS
    ) {
      return { synced: 0 };
    }

    let token = integration.token;
    if (dayjs(integration.tokenExpiration).isBefore(dayjs())) {
      const refreshed = await this._refreshIntegrationService.refresh(
        integration
      );
      if (!refreshed || !refreshed.accessToken) {
        return { synced: 0 };
      }
      token = refreshed.accessToken;
      if (provider.refreshWait) {
        await timer(10000);
      }
    }

    const posts = await this._repository.listPublishedPostsForSync(
      integrationId,
      LOOKBACK_DAYS
    );
    if (posts.length === 0) {
      return { synced: 0 };
    }

    const byReleaseId = new Map(
      posts.filter((p) => p.releaseId).map((p) => [p.releaseId as string, p])
    );

    let rows;
    try {
      rows = await provider.postsAnalytics(
        integration.internalId,
        token,
        [...byReleaseId.keys()]
      );
    } catch (err) {
      if (err instanceof RefreshToken) {
        const refreshed = await this._refreshIntegrationService.refresh(
          integration
        );
        if (!refreshed || !refreshed.accessToken) {
          return { synced: 0 };
        }
        rows = await provider.postsAnalytics(
          integration.internalId,
          refreshed.accessToken,
          [...byReleaseId.keys()]
        );
      } else {
        this.logger.warn(
          `postsAnalytics failed for ${integration.providerIdentifier} ${integrationId}`,
          err as Error
        );
        return { synced: 0 };
      }
    }

    const capturedDay = dayjs.utc().startOf('day').toDate();
    let synced = 0;
    for (const metrics of rows || []) {
      const post = byReleaseId.get(metrics.platformPostId);
      if (!post) {
        continue;
      }
      await this._repository.upsertSnapshot({
        organizationId: post.organizationId,
        postId: post.id,
        integrationId: post.integrationId,
        capturedDay,
        impressions: metrics.impressions,
        reactions: metrics.reactions,
        comments: metrics.comments,
        shares: metrics.shares,
        raw: metrics.raw,
      });
      synced += 1;
    }

    return { synced };
  }

  private reportsPostMetrics(providerIdentifier: string) {
    if (providerIdentifier === 'x' && process.env.DISABLE_X_ANALYTICS) {
      return false;
    }
    const provider =
      this._integrationManager.getSocialIntegration(providerIdentifier);
    return !!provider?.postsAnalytics;
  }

  private async loadMappedPosts(
    organizationId: string,
    query: GetAnalyticsPostsDto
  ) {
    const days = query.date || 30;
    const from = dayjs.utc().subtract(days, 'day').startOf('day').toDate();
    const to = dayjs.utc().endOf('day').toDate();
    const integrationIds = query.integrationIds
      ? query.integrationIds.split(',').filter(Boolean)
      : undefined;

    const { syncing } = await this.maybeEnqueueStaleSync(organizationId);

    const posts = await this._repository.listPublishedPostsForAnalytics({
      organizationId,
      from,
      to,
      integrationIds,
    });

    const mapped = posts
      .filter((post) =>
        this.reportsPostMetrics(post.integration.providerIdentifier)
      )
      .map(mapSnapshotRow)
      .filter((row) =>
        matchesAnalyticsQuery(row, query.q, query.platform)
      );

    return { syncing, date: days, mapped };
  }

  async listPosts(organizationId: string, query: GetAnalyticsPostsDto) {
    const { syncing, date, mapped } = await this.loadMappedPosts(
      organizationId,
      query
    );

    const sorted = sortAnalyticsPosts(mapped, query.sort, query.dir);
    const topReactions = sortAnalyticsPosts(mapped, 'reactions', 'desc').slice(
      0,
      5
    );
    const topComments = sortAnalyticsPosts(mapped, 'comments', 'desc').slice(
      0,
      5
    );

    const page = query.page ?? 0;
    const limit = query.limit ?? 20;
    const start = page * limit;

    return {
      syncing,
      date,
      total: sorted.length,
      page,
      limit,
      notes: ANALYTICS_AGENT_NOTES,
      columns: {
        comments: mapped.some((row) => row.comments != null),
        reactions: mapped.some((row) => row.reactions != null),
        impressions: mapped.some((row) => row.impressions != null),
      },
      posts: sorted.slice(start, start + limit),
      top: topReactions,
      topReactions,
      topComments,
    };
  }

  async summary(organizationId: string, query: GetAnalyticsPostsDto) {
    const { syncing, date, mapped } = await this.loadMappedPosts(
      organizationId,
      query
    );

    return {
      syncing,
      date,
      notes: ANALYTICS_AGENT_NOTES,
      posts: mapped.length,
      reactions: sumKnown(mapped, (row) => row.reactions),
      comments: sumKnown(mapped, (row) => row.comments),
      impressions: sumKnown(mapped, (row) => row.impressions),
    };
  }

  async getPost(organizationId: string, postId: string) {
    const post = await this._repository.getPostForAnalytics(
      organizationId,
      postId
    );
    if (!post) {
      return { error: 'not_found' as const };
    }

    const { syncing } = await this.maybeEnqueueStaleSync(organizationId);

    if (!post.releaseId || post.releaseId === 'missing') {
      return {
        error: 'missing_release' as const,
        syncing,
        notes: ANALYTICS_AGENT_NOTES,
        id: post.id,
        state: post.state,
        platform: post.integration.providerIdentifier,
        channelName: post.integration.name,
        publishDate: post.publishDate.toISOString(),
        content: post.content,
      };
    }

    if (post.state !== State.PUBLISHED) {
      return {
        error: 'not_published' as const,
        syncing,
        notes: ANALYTICS_AGENT_NOTES,
        id: post.id,
        state: post.state,
        platform: post.integration.providerIdentifier,
        channelName: post.integration.name,
        publishDate: post.publishDate.toISOString(),
        content: post.content,
      };
    }

    if (!this.reportsPostMetrics(post.integration.providerIdentifier)) {
      return {
        error: 'unsupported' as const,
        syncing,
        notes: ANALYTICS_AGENT_NOTES,
        id: post.id,
        platform: post.integration.providerIdentifier,
        channelName: post.integration.name,
      };
    }

    return {
      syncing,
      notes: ANALYTICS_AGENT_NOTES,
      post: mapSnapshotRow(post),
    };
  }
}
