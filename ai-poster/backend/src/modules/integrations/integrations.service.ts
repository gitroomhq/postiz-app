import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database.module';

/** OAuth configuration per platform (client IDs and scopes would come from env vars) */
const OAUTH_CONFIG: Record<
  string,
  { authorizeUrl: string; scopes: string }
> = {
  TWITTER: {
    authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
    scopes: 'tweet.read tweet.write users.read offline.access',
  },
  LINKEDIN: {
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scopes: 'r_liteprofile w_member_social',
  },
  LINKEDIN_PAGE: {
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scopes: 'r_organization_social w_organization_social rw_organization_admin',
  },
  FACEBOOK: {
    authorizeUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    scopes: 'pages_manage_posts,pages_read_engagement',
  },
  INSTAGRAM: {
    authorizeUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    scopes: 'instagram_basic,instagram_content_publish',
  },
  YOUTUBE: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: 'https://www.googleapis.com/auth/youtube.upload',
  },
  TIKTOK: {
    authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    scopes: 'user.info.basic,video.publish',
  },
  REDDIT: {
    authorizeUrl: 'https://www.reddit.com/api/v1/authorize',
    scopes: 'submit identity',
  },
  PINTEREST: {
    authorizeUrl: 'https://www.pinterest.com/oauth/',
    scopes: 'boards:read,pins:read,pins:write',
  },
  THREADS: {
    authorizeUrl: 'https://www.threads.net/oauth/authorize',
    scopes: 'threads_basic,threads_content_publish',
  },
  DISCORD: {
    authorizeUrl: 'https://discord.com/api/oauth2/authorize',
    scopes: 'bot',
  },
  SLACK: {
    authorizeUrl: 'https://slack.com/oauth/v2/authorize',
    scopes: 'chat:write,channels:read',
  },
  MASTODON: {
    authorizeUrl: '', // Instance-specific
    scopes: 'read write',
  },
  BLUESKY: {
    authorizeUrl: '', // Uses app password, not OAuth
    scopes: '',
  },
  DRIBBBLE: {
    authorizeUrl: 'https://dribbble.com/oauth/authorize',
    scopes: 'public upload',
  },
};

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async list(organizationId: string) {
    return this.prisma.integration.findMany({
      where: { organizationId },
      include: {
        platformProfile: true,
        _count: { select: { posts: true, campaignChannels: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOAuthUrl(
    organizationId: string,
    platform: string,
  ): Promise<{ url: string; platform: string }> {
    const normalizedPlatform = platform.toUpperCase();
    const config = OAUTH_CONFIG[normalizedPlatform];

    if (!config || !config.authorizeUrl) {
      throw new BadRequestException(
        `Platform ${platform} does not support OAuth or requires manual setup`,
      );
    }

    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3001';
    const redirectUri = `${backendUrl}/api/integrations/callback/${normalizedPlatform}`;

    const clientId =
      this.configService.get<string>(
        `${normalizedPlatform}_CLIENT_ID`,
      ) || 'PLACEHOLDER_CLIENT_ID';

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes,
      state: organizationId,
    });

    return {
      url: `${config.authorizeUrl}?${params.toString()}`,
      platform: normalizedPlatform,
    };
  }

  async handleOAuthCallback(
    organizationId: string,
    platform: string,
    code: string,
  ) {
    const normalizedPlatform = platform.toUpperCase();

    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    // In production, this would:
    // 1. Exchange the authorization code for an access token
    // 2. Fetch the user's profile from the platform
    // 3. Store the tokens securely (encrypted)
    //
    // Placeholder implementation creates a test integration:
    this.logger.log(
      `OAuth callback for ${normalizedPlatform} with code: ${code.substring(0, 8)}...`,
    );

    const integration = await this.prisma.integration.create({
      data: {
        organizationId,
        platform: normalizedPlatform as any,
        name: `${normalizedPlatform} Account`,
        internalId: `${normalizedPlatform.toLowerCase()}_${Date.now()}`,
        token: `placeholder_token_${code.substring(0, 16)}`,
        refreshToken: `placeholder_refresh_${Date.now()}`,
        tokenExpiration: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        metadata: {
          connectedVia: 'oauth',
          connectedAt: new Date().toISOString(),
        },
      },
      include: { platformProfile: true },
    });

    // Create a default platform profile
    await this.prisma.platformProfile.create({
      data: {
        integrationId: integration.id,
        organizationId,
        platform: normalizedPlatform as any,
        settings: {},
        preferredTimes: [540, 720, 1020], // 9am, 12pm, 5pm UTC
      },
    });

    return integration;
  }

  async update(
    organizationId: string,
    id: string,
    data: { name?: string; disabled?: boolean; metadata?: Record<string, any> },
  ) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.disabled !== undefined) updateData.disabled = data.disabled;
    if (data.metadata !== undefined) {
      // Merge with existing metadata
      updateData.metadata = {
        ...(integration.metadata as Record<string, any> || {}),
        ...data.metadata,
      };
    }

    return this.prisma.integration.update({
      where: { id },
      data: updateData,
      include: { platformProfile: true },
    });
  }

  async remove(organizationId: string, id: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    // Check for scheduled posts that depend on this integration
    const scheduledPosts = await this.prisma.post.count({
      where: {
        integrationId: id,
        state: { in: ['SCHEDULED', 'PUBLISHING'] },
      },
    });

    if (scheduledPosts > 0) {
      throw new BadRequestException(
        `Cannot remove integration with ${scheduledPosts} scheduled/publishing post(s). Cancel or reassign them first.`,
      );
    }

    await this.prisma.integration.delete({ where: { id } });
    return { success: true };
  }

  async updateProfile(
    organizationId: string,
    integrationId: string,
    data: { settings: Record<string, any>; preferredTimes?: number[] },
  ) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, organizationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    // Validate preferred times (0-1439 minutes from midnight)
    if (data.preferredTimes) {
      for (const time of data.preferredTimes) {
        if (time < 0 || time > 1439) {
          throw new BadRequestException(
            `Invalid preferred time: ${time}. Must be between 0 and 1439 (minutes from midnight).`,
          );
        }
      }
    }

    return this.prisma.platformProfile.upsert({
      where: { integrationId },
      create: {
        integrationId,
        organizationId,
        platform: integration.platform,
        settings: data.settings,
        preferredTimes: data.preferredTimes || [],
      },
      update: {
        settings: data.settings,
        ...(data.preferredTimes !== undefined && {
          preferredTimes: data.preferredTimes,
        }),
      },
    });
  }

  async getProfile(organizationId: string, integrationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, organizationId },
      select: { id: true, platform: true, name: true },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const profile = await this.prisma.platformProfile.findFirst({
      where: { integrationId, organizationId },
    });

    return {
      integration,
      profile: profile || { settings: {}, preferredTimes: [] },
    };
  }
}
