import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../worker.module';
import {
  PUBLISH_POST_QUEUE,
  PublishPostJobData,
} from '../queues/publish-post.queue';
import {
  REFRESH_TOKEN_QUEUE,
  RefreshTokenJobData,
} from '../queues/refresh-token.queue';
import {
  ANALYTICS_SYNC_QUEUE,
  AnalyticsSyncJobData,
  ANALYTICS_SYNC_JOB_OPTIONS,
} from '../queues/analytics-sync.queue';
import { PLATFORM_LIMITS } from '@ai-poster/shared/constants/platform-limits';
import { Platform } from '@ai-poster/shared/types/platform.types';

@Processor(PUBLISH_POST_QUEUE)
export class PublishPostProcessor extends WorkerHost {
  private readonly logger = new Logger(PublishPostProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(REFRESH_TOKEN_QUEUE)
    private readonly refreshTokenQueue: Queue<RefreshTokenJobData>,
    @InjectQueue(ANALYTICS_SYNC_QUEUE)
    private readonly analyticsSyncQueue: Queue<AnalyticsSyncJobData>,
    @InjectQueue(PUBLISH_POST_QUEUE)
    private readonly publishPostQueue: Queue<PublishPostJobData>,
  ) {
    super();
  }

  async process(job: Job<PublishPostJobData>): Promise<void> {
    const { postId, integrationId, organizationId } = job.data;
    this.logger.log(
      `Processing publish-post job ${job.id} | post=${postId} integration=${integrationId}`,
    );

    try {
      // ── Step 1: Load post and integration from DB ──
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          postMedia: {
            include: { media: true },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!post) {
        this.logger.error(`Post ${postId} not found, skipping`);
        return;
      }

      const integration = await this.prisma.integration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        this.logger.error(`Integration ${integrationId} not found, skipping`);
        await this.markPostFailed(postId, 'Integration not found');
        return;
      }

      // ── Step 2: Check integration is valid and token not expired ──
      if (integration.disabled) {
        this.logger.warn(
          `Integration ${integrationId} is disabled, failing post`,
        );
        await this.markPostFailed(postId, 'Integration is disabled');
        return;
      }

      if (this.isTokenExpired(integration)) {
        this.logger.warn(
          `Token expired for integration ${integrationId}, queueing refresh and rescheduling`,
        );

        // Queue a token refresh
        await this.refreshTokenQueue.add('refresh', { integrationId });

        // Reschedule this publish job for 2 minutes later
        await this.publishPostQueue.add(
          'publish',
          { postId, integrationId, organizationId },
          { delay: 2 * 60 * 1000 },
        );

        return;
      }

      // ── Step 3: Update post state to PUBLISHING ──
      await this.prisma.post.update({
        where: { id: postId },
        data: { state: 'PUBLISHING' },
      });

      // ── Step 4: Format content using platform-specific rules ──
      const platform = integration.platform as Platform;
      const limits = PLATFORM_LIMITS[platform];
      let formattedContent = this.stripHtml(post.content);

      // Truncate to platform character limit if necessary
      if (limits && formattedContent.length > limits.maxChars) {
        formattedContent =
          formattedContent.substring(0, limits.maxChars - 3) + '...';
      }

      // Collect media paths for upload
      const mediaPaths = post.postMedia.map((pm) => ({
        path: pm.media.path,
        type: pm.media.type,
        mimeType: pm.media.mimeType,
        altText: pm.altText,
      }));

      // ── Step 5: Make API call to social platform ──
      const publishResult = await this.publishToPlatform(
        platform,
        integration,
        formattedContent,
        mediaPaths,
        post.platformSettings as Record<string, unknown> | null,
      );

      // ── Step 6: On success - update post state to POSTED ──
      await this.prisma.post.update({
        where: { id: postId },
        data: {
          state: 'POSTED',
          publishedAt: new Date(),
          platformPostId: publishResult.platformPostId,
          platformUrl: publishResult.platformUrl,
        },
      });

      this.logger.log(
        `Post ${postId} published successfully to ${platform} | platformPostId=${publishResult.platformPostId}`,
      );

      // ── Step 7: Queue analytics-sync job for 1 hour later ──
      await this.analyticsSyncQueue.add(
        'sync',
        { postId, integrationId },
        {
          ...ANALYTICS_SYNC_JOB_OPTIONS,
          delay: 60 * 60 * 1000, // 1 hour
        },
      );

      // ── Step 8: Send webhook notifications ──
      await this.sendWebhookNotifications(
        organizationId,
        'POST_PUBLISHED',
        {
          postId,
          integrationId,
          platform,
          platformPostId: publishResult.platformPostId,
          platformUrl: publishResult.platformUrl,
          publishedAt: new Date().toISOString(),
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to publish post ${postId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // ── Step 6 (failure path): Update post state to FAILED ──
      await this.markPostFailed(postId, errorMessage);

      // Send failure webhook
      await this.sendWebhookNotifications(
        organizationId,
        'POST_FAILED',
        {
          postId,
          integrationId,
          error: errorMessage,
          attempt: job.attemptsMade + 1,
        },
      );

      // Re-throw so BullMQ handles the retry with exponential backoff
      throw error;
    }
  }

  // ─── Platform Publishing (Placeholder) ─────────────────────────────

  private async publishToPlatform(
    platform: Platform,
    integration: { id: string; token: string; internalId: string; metadata: unknown },
    content: string,
    media: { path: string; type: string; mimeType: string | null; altText: string | null }[],
    platformSettings: Record<string, unknown> | null,
  ): Promise<{ platformPostId: string; platformUrl: string }> {
    switch (platform) {
      case Platform.TWITTER:
        // TODO: Use Twitter API v2 to create a tweet
        // POST https://api.twitter.com/2/tweets
        // Authorization: Bearer {integration.token}
        // Body: { text: content }
        // If media: upload via media/upload endpoint first, attach media_ids
        // If thread: create first tweet, then reply chain
        return this.placeholderPublish(platform, integration.internalId);

      case Platform.LINKEDIN:
      case Platform.LINKEDIN_PAGE:
        // TODO: Use LinkedIn Share API
        // POST https://api.linkedin.com/v2/ugcPosts
        // Authorization: Bearer {integration.token}
        // Body: { author: "urn:li:person:{internalId}", lifecycleState: "PUBLISHED", ... }
        return this.placeholderPublish(platform, integration.internalId);

      case Platform.FACEBOOK:
        // TODO: Use Facebook Graph API
        // POST https://graph.facebook.com/v18.0/{pageId}/feed
        // access_token={integration.token}
        // Body: { message: content }
        // If media: use /photos or /videos endpoint
        return this.placeholderPublish(platform, integration.internalId);

      case Platform.INSTAGRAM:
        // TODO: Use Instagram Graph API (requires media)
        // Step 1: POST /{ig-user-id}/media with image_url and caption
        // Step 2: POST /{ig-user-id}/media_publish with creation_id
        // For carousel: POST /{ig-user-id}/media for each item, then /{ig-user-id}/media with children
        return this.placeholderPublish(platform, integration.internalId);

      case Platform.YOUTUBE:
        // TODO: Use YouTube Data API v3
        // POST https://www.googleapis.com/upload/youtube/v3/videos
        // Authorization: Bearer {integration.token}
        // Part: snippet,status
        // Requires video file upload
        return this.placeholderPublish(platform, integration.internalId);

      case Platform.TIKTOK:
        // TODO: Use TikTok Content Posting API
        // POST https://open.tiktokapis.com/v2/post/publish/video/init/
        // Authorization: Bearer {integration.token}
        // Requires video upload
        return this.placeholderPublish(platform, integration.internalId);

      case Platform.REDDIT:
        // TODO: Use Reddit API
        // POST https://oauth.reddit.com/api/submit
        // Authorization: Bearer {integration.token}
        // Body: { kind: "self", sr: subreddit, title, text }
        return this.placeholderPublish(platform, integration.internalId);

      case Platform.PINTEREST:
        // TODO: Use Pinterest API v5
        // POST https://api.pinterest.com/v5/pins
        // Authorization: Bearer {integration.token}
        // Body: { board_id, title, description, media_source }
        return this.placeholderPublish(platform, integration.internalId);

      case Platform.THREADS:
        // TODO: Use Threads API (Meta)
        // POST https://graph.threads.net/v1.0/{user-id}/threads
        // Step 1: Create media container
        // Step 2: Publish container
        return this.placeholderPublish(platform, integration.internalId);

      case Platform.DISCORD:
        // TODO: Use Discord Bot API
        // POST https://discord.com/api/v10/channels/{channelId}/messages
        // Authorization: Bot {token}
        // Body: { content }
        return this.placeholderPublish(platform, integration.internalId);

      case Platform.SLACK:
        // TODO: Use Slack Web API
        // POST https://slack.com/api/chat.postMessage
        // Authorization: Bearer {integration.token}
        // Body: { channel, text }
        return this.placeholderPublish(platform, integration.internalId);

      case Platform.MASTODON:
        // TODO: Use Mastodon API
        // POST https://{instance}/api/v1/statuses
        // Authorization: Bearer {integration.token}
        // Body: { status: content }
        // If media: upload via /api/v2/media first
        return this.placeholderPublish(platform, integration.internalId);

      case Platform.BLUESKY:
        // TODO: Use AT Protocol (Bluesky)
        // POST https://bsky.social/xrpc/com.atproto.repo.createRecord
        // Body: { repo: did, collection: "app.bsky.feed.post", record: { text, createdAt } }
        return this.placeholderPublish(platform, integration.internalId);

      case Platform.DRIBBBLE:
        // TODO: Use Dribbble API v2
        // POST https://api.dribbble.com/v2/shots
        // Authorization: Bearer {integration.token}
        // Body: { title, description, image (file upload) }
        return this.placeholderPublish(platform, integration.internalId);

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async placeholderPublish(
    platform: Platform,
    internalId: string,
  ): Promise<{ platformPostId: string; platformUrl: string }> {
    // TODO: Replace with actual API calls for each platform
    this.logger.warn(
      `[PLACEHOLDER] Simulating publish to ${platform} for account ${internalId}`,
    );

    const fakePostId = `${platform.toLowerCase()}_${Date.now()}`;
    return {
      platformPostId: fakePostId,
      platformUrl: `https://${platform.toLowerCase()}.com/post/${fakePostId}`,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  private isTokenExpired(integration: {
    tokenExpiration: Date | null;
    refreshNeeded: boolean;
  }): boolean {
    if (integration.refreshNeeded) return true;
    if (!integration.tokenExpiration) return false;
    // Consider expired if less than 5 minutes remain
    const bufferMs = 5 * 60 * 1000;
    return new Date(integration.tokenExpiration).getTime() - Date.now() < bufferMs;
  }

  private async markPostFailed(
    postId: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      await this.prisma.post.update({
        where: { id: postId },
        data: {
          state: 'FAILED',
          platformSettings: {
            lastError: errorMessage,
            failedAt: new Date().toISOString(),
          },
        },
      });
    } catch (updateError) {
      this.logger.error(
        `Failed to mark post ${postId} as FAILED: ${updateError}`,
      );
    }
  }

  private async sendWebhookNotifications(
    organizationId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      const webhooks = await this.prisma.webhook.findMany({
        where: {
          organizationId,
          active: true,
          events: { has: event as any },
        },
      });

      for (const webhook of webhooks) {
        try {
          // Fire-and-forget webhook delivery
          await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(webhook.secret
                ? { 'X-Webhook-Secret': webhook.secret }
                : {}),
            },
            body: JSON.stringify({
              event,
              timestamp: new Date().toISOString(),
              data: payload,
            }),
            signal: AbortSignal.timeout(10_000),
          });
        } catch (webhookError) {
          this.logger.warn(
            `Failed to deliver webhook to ${webhook.url}: ${webhookError}`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch webhooks: ${error}`);
    }
  }

  private stripHtml(text: string): string {
    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
