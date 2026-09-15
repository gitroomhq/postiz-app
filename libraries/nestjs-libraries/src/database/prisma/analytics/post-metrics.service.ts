import { Injectable, Logger } from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { TemporalService } from 'nestjs-temporal-core';
import { State } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { PostMetricsRepository } from '@gitroom/nestjs-libraries/database/prisma/analytics/post-metrics.repository';
import {
  ANALYTICS_AGENT_NOTES,
  AnalyticsPostRow,
  analyticsPublishDateRange,
  mapSnapshotRow,
  matchesAnalyticsQuery,
  overlaySnapshotSeries,
  sortAnalyticsPosts,
  summarizeAnalyticsPosts,
  topAnalyticsPosts,
  toAgentPost,
} from '@gitroom/nestjs-libraries/database/prisma/analytics/post-metrics.query';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { RefreshIntegrationService } from '@gitroom/nestjs-libraries/integrations/refresh.integration.service';
import {
  Disconnect,
  RefreshToken,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { GetAnalyticsPostsDto } from '@gitroom/nestjs-libraries/dtos/analytics/get.analytics.posts.dto';
import { timer } from '@gitroom/helpers/utils/timer';
import { hasKnownPostMetric } from '@gitroom/nestjs-libraries/integrations/social/post-metrics.map';

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
    private _temporalService: TemporalService,
  ) {}

  async listIntegrationsNeedingSync(
    organizationId?: string,
    freshAfter?: Date
  ) {
    const targets = await this._repository.listIntegrationsNeedingSync(
      LOOKBACK_DAYS,
      organizationId,
      freshAfter
    );
    return targets
      .filter((target) =>
        this.reportsPostMetrics(target.integration.providerIdentifier),
      )
      .map(({ integration: _, ...target }) => target);
  }

  async enqueueOrgSync(organizationId: string) {
    const workflowId = `analytics-sync-org-v1-${organizationId}-${Math.floor(
      Date.now() / STALE_AFTER_MS,
    )}`;
    const client = this._temporalService.client.getRawClient();
    if (!client) {
      this.logger.error(
        `Could not enqueue analytics sync for organization ${organizationId}: Temporal client unavailable`,
      );
      return false;
    }
    try {
      await client.workflow.start('analyticsSyncOrgWorkflowV1', {
        workflowId,
        taskQueue: 'main',
        args: [{ organizationId }],
        workflowIdConflictPolicy: 'USE_EXISTING',
        workflowIdReusePolicy: 'REJECT_DUPLICATE',
      });
      return true;
    } catch (err) {
      if (
        (err as { name?: string })?.name ===
        'WorkflowExecutionAlreadyStartedError'
      ) {
        return false;
      }
      this.logger.error(
        `Could not enqueue analytics sync for organization ${organizationId}`,
        err as Error,
      );
      return false;
    }
  }

  async maybeEnqueueStaleSync(organizationId: string) {
    const targets = await this.listIntegrationsNeedingSync(
      organizationId,
      new Date(Date.now() - STALE_AFTER_MS)
    );
    if (targets.length === 0) {
      return { syncing: false };
    }

    const started = await this.enqueueOrgSync(organizationId);
    return { syncing: started, started };
  }

  async syncIntegration(organizationId: string, integrationId: string) {
    const integration = await this._repository.getIntegration(
      organizationId,
      integrationId,
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
      integration.providerIdentifier,
    );
    if (!provider?.postsAnalytics) {
      return { synced: 0 };
    }
    if (provider.analyticsDisabled?.()) {
      return { synced: 0 };
    }

    let token = integration.token;
    if (dayjs(integration.tokenExpiration).isBefore(dayjs())) {
      const refreshed =
        await this._refreshIntegrationService.refresh(integration);
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
      LOOKBACK_DAYS,
    );
    if (posts.length === 0) {
      return { synced: 0 };
    }

    const byReleaseId = new Map(
      posts.filter((p) => p.releaseId).map((p) => [p.releaseId as string, p]),
    );

    let rows;
    try {
      rows = await provider.postsAnalytics(integration.internalId, token, [
        ...byReleaseId.keys(),
      ]);
    } catch (err) {
      if (err instanceof RefreshToken || err instanceof Disconnect) {
        const refreshed =
          await this._refreshIntegrationService.refresh(integration);
        if (!refreshed || !refreshed.accessToken) {
          return { synced: 0 };
        }
        rows = await provider.postsAnalytics(
          integration.internalId,
          refreshed.accessToken,
          [...byReleaseId.keys()],
        );
      } else {
        this.logger.warn(
          `postsAnalytics failed for ${integration.providerIdentifier} ${integrationId}`,
          err as Error,
        );
        return { synced: 0 };
      }
    }

    const capturedDay = dayjs.utc().startOf('day').toDate();
    let synced = 0;
    for (const metrics of rows || []) {
      if (!hasKnownPostMetric(metrics)) {
        continue;
      }
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
    const provider =
      this._integrationManager.getSocialIntegration(providerIdentifier);
    return !!provider?.postsAnalytics && !provider.analyticsDisabled?.();
  }

  private async loadMappedPosts(
    organizationId: string,
    query: GetAnalyticsPostsDto,
  ) {
    const days = query.date || 30;
    const { from, to } = analyticsPublishDateRange(days);
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
        this.reportsPostMetrics(post.integration.providerIdentifier),
      )
      .map(mapSnapshotRow)
      .filter((row) => matchesAnalyticsQuery(row, query.q, query.platform));

    return { syncing, date: days, mapped };
  }

  async listPosts(organizationId: string, query: GetAnalyticsPostsDto) {
    const { syncing, date, mapped } = await this.loadMappedPosts(
      organizationId,
      query,
    );

    const sorted = sortAnalyticsPosts(mapped, query.sort, query.dir);
    const topReactions = topAnalyticsPosts(mapped, 'reactions');
    const topComments = topAnalyticsPosts(mapped, 'comments');

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
        engagement: mapped.some((row) => row.engagementRate != null),
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
      query,
    );

    return {
      syncing,
      date,
      notes: ANALYTICS_AGENT_NOTES,
      ...summarizeAnalyticsPosts(mapped),
    };
  }

  async getPost(organizationId: string, postId: string) {
    const post = await this._repository.getPostForAnalytics(
      organizationId,
      postId,
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

  snapshotsForPost(organizationId: string, postId: string, days: number) {
    const { from, to } = analyticsPublishDateRange(days);
    return this._repository.listSnapshotsForPost(
      organizationId,
      postId,
      from,
      to,
    );
  }

  async postStatisticsSeries(
    organizationId: string,
    postId: string,
    days: number,
    live: Array<{
      label: string;
      data: Array<{ total: string; date: string }>;
      percentageChange: number;
    }>,
  ) {
    const snapshots = await this.snapshotsForPost(
      organizationId,
      postId,
      days,
    );
    return overlaySnapshotSeries(live, snapshots);
  }
}
