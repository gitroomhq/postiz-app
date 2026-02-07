import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';

import { PrismaService } from '../worker.module';
import {
  ANALYTICS_SYNC_QUEUE,
  AnalyticsSyncJobData,
  ANALYTICS_SYNC_JOB_OPTIONS,
} from '../queues/analytics-sync.queue';
import { Platform } from '@ai-poster/shared/types/platform.types';

interface PlatformAnalytics {
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  saves: number;
  engagementRate: number;
  reachEstimate: number;
  extraMetrics?: Record<string, unknown>;
}

@Processor(ANALYTICS_SYNC_QUEUE)
export class AnalyticsSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsSyncProcessor.name);

  /** Stop syncing analytics after 30 days */
  private static readonly MAX_SYNC_DAYS = 30;

  /** Re-sync interval: 24 hours */
  private static readonly RESYNC_DELAY_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(ANALYTICS_SYNC_QUEUE)
    private readonly analyticsSyncQueue: Queue<AnalyticsSyncJobData>,
  ) {
    super();
  }

  async process(job: Job<AnalyticsSyncJobData>): Promise<void> {
    const { postId, integrationId } = job.data;
    this.logger.log(
      `Processing analytics-sync job ${job.id} | post=${postId} integration=${integrationId}`,
    );

    try {
      // ── Step 1: Load post and integration from DB ──
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        this.logger.error(`Post ${postId} not found, skipping analytics sync`);
        return;
      }

      if (post.state !== 'POSTED') {
        this.logger.warn(
          `Post ${postId} is in state ${post.state}, not POSTED. Skipping analytics sync.`,
        );
        return;
      }

      const integration = await this.prisma.integration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        this.logger.error(
          `Integration ${integrationId} not found, skipping analytics sync`,
        );
        return;
      }

      if (integration.disabled) {
        this.logger.warn(
          `Integration ${integrationId} is disabled, skipping analytics sync`,
        );
        return;
      }

      // ── Step 2: Call platform analytics API ──
      const platform = integration.platform as Platform;
      const platformPostId = post.platformPostId;

      if (!platformPostId) {
        this.logger.warn(
          `Post ${postId} has no platformPostId, cannot fetch analytics`,
        );
        return;
      }

      const analytics = await this.fetchPlatformAnalytics(
        platform,
        integration.token,
        platformPostId,
        integration.internalId,
      );

      // ── Step 3: Create or update Analytics record ──
      // Check if an analytics record already exists for this post
      const existingAnalytics = await this.prisma.analytics.findFirst({
        where: {
          postId,
          integrationId,
        },
        orderBy: { fetchedAt: 'desc' },
      });

      if (existingAnalytics) {
        // Update existing analytics record with latest data
        await this.prisma.analytics.update({
          where: { id: existingAnalytics.id },
          data: {
            impressions: analytics.impressions,
            likes: analytics.likes,
            comments: analytics.comments,
            shares: analytics.shares,
            clicks: analytics.clicks,
            saves: analytics.saves,
            engagementRate: analytics.engagementRate,
            reachEstimate: analytics.reachEstimate,
            extraMetrics: analytics.extraMetrics ?? undefined,
            fetchedAt: new Date(),
          },
        });

        this.logger.log(
          `Updated analytics for post ${postId}: impressions=${analytics.impressions} likes=${analytics.likes} comments=${analytics.comments}`,
        );
      } else {
        // Create new analytics record
        await this.prisma.analytics.create({
          data: {
            postId,
            integrationId,
            impressions: analytics.impressions,
            likes: analytics.likes,
            comments: analytics.comments,
            shares: analytics.shares,
            clicks: analytics.clicks,
            saves: analytics.saves,
            engagementRate: analytics.engagementRate,
            reachEstimate: analytics.reachEstimate,
            extraMetrics: analytics.extraMetrics ?? undefined,
          },
        });

        this.logger.log(
          `Created analytics for post ${postId}: impressions=${analytics.impressions} likes=${analytics.likes} comments=${analytics.comments}`,
        );
      }

      // ── Step 4: Schedule next sync for 24 hours later ──
      // Only continue syncing for up to MAX_SYNC_DAYS after publish
      if (post.publishedAt) {
        const daysSincePublish = Math.floor(
          (Date.now() - new Date(post.publishedAt).getTime()) /
            (24 * 60 * 60 * 1000),
        );

        if (daysSincePublish < AnalyticsSyncProcessor.MAX_SYNC_DAYS) {
          await this.analyticsSyncQueue.add(
            'sync',
            { postId, integrationId },
            {
              ...ANALYTICS_SYNC_JOB_OPTIONS,
              delay: AnalyticsSyncProcessor.RESYNC_DELAY_MS,
              jobId: `analytics-${postId}-${Date.now()}`,
            },
          );

          this.logger.log(
            `Scheduled next analytics sync for post ${postId} in 24 hours (day ${daysSincePublish + 1}/${AnalyticsSyncProcessor.MAX_SYNC_DAYS})`,
          );
        } else {
          this.logger.log(
            `Post ${postId} has been published for ${daysSincePublish} days, stopping analytics sync`,
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync analytics for post ${postId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // ─── Platform Analytics Fetching (Placeholder) ─────────────────────

  private async fetchPlatformAnalytics(
    platform: Platform,
    token: string,
    platformPostId: string,
    internalId: string,
  ): Promise<PlatformAnalytics> {
    switch (platform) {
      case Platform.TWITTER:
        // TODO: Use Twitter API v2 Tweet metrics
        // GET https://api.twitter.com/2/tweets/{id}?tweet.fields=public_metrics,non_public_metrics,organic_metrics
        // Authorization: Bearer {token}
        // Response: { data: { public_metrics: { impression_count, like_count, reply_count, retweet_count, bookmark_count } } }
        return this.placeholderAnalytics(platform, platformPostId);

      case Platform.LINKEDIN:
      case Platform.LINKEDIN_PAGE:
        // TODO: Use LinkedIn Share Statistics API
        // GET https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:{id}&shares=urn:li:share:{postId}
        // Authorization: Bearer {token}
        return this.placeholderAnalytics(platform, platformPostId);

      case Platform.FACEBOOK:
        // TODO: Use Facebook Graph API Insights
        // GET https://graph.facebook.com/v18.0/{postId}/insights?metric=post_impressions,post_engaged_users,post_clicks
        // access_token={token}
        return this.placeholderAnalytics(platform, platformPostId);

      case Platform.INSTAGRAM:
        // TODO: Use Instagram Graph API Media Insights
        // GET https://graph.facebook.com/v18.0/{media-id}/insights?metric=impressions,reach,likes,comments,saved,shares
        // access_token={token}
        return this.placeholderAnalytics(platform, platformPostId);

      case Platform.YOUTUBE:
        // TODO: Use YouTube Analytics API
        // GET https://youtubeanalytics.googleapis.com/v2/reports
        // ?ids=channel=={channelId}&startDate=...&endDate=...&metrics=views,likes,comments,shares
        // Authorization: Bearer {token}
        return this.placeholderAnalytics(platform, platformPostId);

      case Platform.TIKTOK:
        // TODO: Use TikTok Video Query API
        // POST https://open.tiktokapis.com/v2/video/query/
        // Body: { filters: { video_ids: [platformPostId] }, fields: ["like_count", "comment_count", "share_count", "view_count"] }
        // Authorization: Bearer {token}
        return this.placeholderAnalytics(platform, platformPostId);

      case Platform.REDDIT:
        // TODO: Use Reddit API
        // GET https://oauth.reddit.com/api/info?id=t3_{platformPostId}
        // Authorization: Bearer {token}
        // Response includes: ups, downs, score, num_comments
        return this.placeholderAnalytics(platform, platformPostId);

      case Platform.PINTEREST:
        // TODO: Use Pinterest API v5
        // GET https://api.pinterest.com/v5/pins/{pin_id}
        // Authorization: Bearer {token}
        // Fields include: pin_metrics (impression, save, click)
        return this.placeholderAnalytics(platform, platformPostId);

      case Platform.THREADS:
        // TODO: Use Threads Insights API
        // GET https://graph.threads.net/v1.0/{media-id}/insights?metric=views,likes,replies,reposts,quotes
        // access_token={token}
        return this.placeholderAnalytics(platform, platformPostId);

      case Platform.DISCORD:
        // Discord does not provide analytics APIs for messages
        return this.emptyAnalytics();

      case Platform.SLACK:
        // Slack does not provide post-level analytics
        return this.emptyAnalytics();

      case Platform.MASTODON:
        // TODO: Use Mastodon API
        // GET https://{instance}/api/v1/statuses/{id}
        // Response includes: reblogs_count, favourites_count, replies_count
        return this.placeholderAnalytics(platform, platformPostId);

      case Platform.BLUESKY:
        // TODO: Use AT Protocol
        // GET post thread and extract like_count, repost_count, reply_count
        return this.placeholderAnalytics(platform, platformPostId);

      case Platform.DRIBBBLE:
        // TODO: Use Dribbble API v2
        // GET https://api.dribbble.com/v2/shots/{id}
        // Response includes: likes_count, views_count, comments_count
        return this.placeholderAnalytics(platform, platformPostId);

      default:
        this.logger.warn(
          `No analytics implementation for platform: ${platform}`,
        );
        return this.emptyAnalytics();
    }
  }

  private async placeholderAnalytics(
    platform: Platform,
    platformPostId: string,
  ): Promise<PlatformAnalytics> {
    // TODO: Replace with actual API calls for each platform
    this.logger.warn(
      `[PLACEHOLDER] Simulating analytics fetch for ${platform} post ${platformPostId}`,
    );

    // Return simulated analytics data
    const baseImpressions = Math.floor(Math.random() * 10000);
    const engagementRate =
      baseImpressions > 0
        ? Math.round(
            ((Math.floor(Math.random() * 500) +
              Math.floor(Math.random() * 100)) /
              baseImpressions) *
              10000,
          ) / 100
        : 0;

    return {
      impressions: baseImpressions,
      likes: Math.floor(Math.random() * 500),
      comments: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      clicks: Math.floor(Math.random() * 200),
      saves: Math.floor(Math.random() * 30),
      engagementRate,
      reachEstimate: Math.floor(baseImpressions * 0.7),
      extraMetrics: {
        platform,
        fetchedVia: 'placeholder',
      },
    };
  }

  private emptyAnalytics(): PlatformAnalytics {
    return {
      impressions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      clicks: 0,
      saves: 0,
      engagementRate: 0,
      reachEstimate: 0,
    };
  }
}
