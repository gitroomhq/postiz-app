import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../worker.module';
import {
  REFRESH_TOKEN_QUEUE,
  RefreshTokenJobData,
} from '../queues/refresh-token.queue';
import { Platform } from '@ai-poster/shared/types/platform.types';

interface TokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

@Processor(REFRESH_TOKEN_QUEUE)
export class RefreshTokenProcessor extends WorkerHost {
  private readonly logger = new Logger(RefreshTokenProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<RefreshTokenJobData>): Promise<void> {
    const { integrationId } = job.data;
    this.logger.log(
      `Processing refresh-token job ${job.id} | integration=${integrationId}`,
    );

    try {
      // ── Step 1: Load integration from DB ──
      const integration = await this.prisma.integration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        this.logger.error(`Integration ${integrationId} not found, skipping`);
        return;
      }

      if (integration.disabled) {
        this.logger.warn(
          `Integration ${integrationId} is disabled, skipping refresh`,
        );
        return;
      }

      if (!integration.refreshToken) {
        this.logger.warn(
          `Integration ${integrationId} has no refresh token, cannot refresh`,
        );
        await this.prisma.integration.update({
          where: { id: integrationId },
          data: { refreshNeeded: true },
        });
        return;
      }

      // ── Step 2: Call platform-specific token refresh endpoint ──
      const platform = integration.platform as Platform;
      const result = await this.refreshPlatformToken(
        platform,
        integration.refreshToken,
        integration.metadata as Record<string, unknown> | null,
      );

      // ── Step 3: Update token and tokenExpiration in DB ──
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: {
          token: result.accessToken,
          refreshToken: result.refreshToken || integration.refreshToken,
          tokenExpiration: result.expiresAt,
          refreshNeeded: false,
        },
      });

      this.logger.log(
        `Successfully refreshed token for integration ${integrationId} (${platform}), expires at ${result.expiresAt.toISOString()}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to refresh token for integration ${integrationId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Mark as needing refresh so the user knows re-authorization is needed
      try {
        await this.prisma.integration.update({
          where: { id: integrationId },
          data: { refreshNeeded: true },
        });
      } catch (updateError) {
        this.logger.error(`Failed to mark integration as refreshNeeded: ${updateError}`);
      }

      throw error;
    }
  }

  // ─── Platform-Specific Token Refresh (Placeholder) ─────────────────

  private async refreshPlatformToken(
    platform: Platform,
    refreshToken: string,
    metadata: Record<string, unknown> | null,
  ): Promise<TokenRefreshResult> {
    switch (platform) {
      case Platform.TWITTER:
        // TODO: Implement Twitter OAuth 2.0 PKCE token refresh
        // POST https://api.twitter.com/2/oauth2/token
        // Body: { grant_type: "refresh_token", refresh_token, client_id }
        return this.placeholderRefresh(platform, refreshToken);

      case Platform.LINKEDIN:
      case Platform.LINKEDIN_PAGE:
        // TODO: Implement LinkedIn OAuth 2.0 token refresh
        // POST https://www.linkedin.com/oauth/v2/accessToken
        // Body: { grant_type: "refresh_token", refresh_token, client_id, client_secret }
        return this.placeholderRefresh(platform, refreshToken);

      case Platform.FACEBOOK:
      case Platform.INSTAGRAM:
      case Platform.THREADS:
        // TODO: Implement Facebook/Instagram long-lived token exchange
        // GET https://graph.facebook.com/v18.0/oauth/access_token
        // ?grant_type=fb_exchange_token&client_id={}&client_secret={}&fb_exchange_token={}
        return this.placeholderRefresh(platform, refreshToken);

      case Platform.YOUTUBE:
        // TODO: Implement Google OAuth 2.0 token refresh
        // POST https://oauth2.googleapis.com/token
        // Body: { grant_type: "refresh_token", refresh_token, client_id, client_secret }
        return this.placeholderRefresh(platform, refreshToken);

      case Platform.TIKTOK:
        // TODO: Implement TikTok OAuth token refresh
        // POST https://open.tiktokapis.com/v2/oauth/token/
        // Body: { grant_type: "refresh_token", refresh_token, client_key, client_secret }
        return this.placeholderRefresh(platform, refreshToken);

      case Platform.REDDIT:
        // TODO: Implement Reddit OAuth token refresh
        // POST https://www.reddit.com/api/v1/access_token
        // Body: grant_type=refresh_token&refresh_token={}
        // Authorization: Basic base64(client_id:client_secret)
        return this.placeholderRefresh(platform, refreshToken);

      case Platform.PINTEREST:
        // TODO: Implement Pinterest OAuth token refresh
        // POST https://api.pinterest.com/v5/oauth/token
        // Body: { grant_type: "refresh_token", refresh_token }
        // Authorization: Basic base64(client_id:client_secret)
        return this.placeholderRefresh(platform, refreshToken);

      case Platform.DISCORD:
        // TODO: Implement Discord OAuth2 token refresh
        // POST https://discord.com/api/v10/oauth2/token
        // Body: { grant_type: "refresh_token", refresh_token, client_id, client_secret }
        return this.placeholderRefresh(platform, refreshToken);

      case Platform.SLACK:
        // TODO: Slack tokens generally don't expire, but implement rotation if needed
        // POST https://slack.com/api/oauth.v2.access for token rotation
        return this.placeholderRefresh(platform, refreshToken);

      case Platform.MASTODON:
        // TODO: Mastodon tokens typically don't expire
        // If needed: POST https://{instance}/oauth/token
        return this.placeholderRefresh(platform, refreshToken);

      case Platform.BLUESKY:
        // TODO: Bluesky uses session refresh
        // POST https://bsky.social/xrpc/com.atproto.server.refreshSession
        // Authorization: Bearer {refreshToken}
        return this.placeholderRefresh(platform, refreshToken);

      case Platform.DRIBBBLE:
        // TODO: Implement Dribbble OAuth token refresh
        // Dribbble tokens may be long-lived; implement if refresh is supported
        return this.placeholderRefresh(platform, refreshToken);

      default:
        throw new Error(`Unsupported platform for token refresh: ${platform}`);
    }
  }

  private async placeholderRefresh(
    platform: Platform,
    _refreshToken: string,
  ): Promise<TokenRefreshResult> {
    // TODO: Replace with actual OAuth refresh flow per platform
    this.logger.warn(
      `[PLACEHOLDER] Simulating token refresh for ${platform}`,
    );

    // Simulate a new token that expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    return {
      accessToken: `refreshed_token_${platform.toLowerCase()}_${Date.now()}`,
      expiresAt,
    };
  }
}
