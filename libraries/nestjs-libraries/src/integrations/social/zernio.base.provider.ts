import {
  AuthTokenDetails,
  ClientInformation,
  GenerateAuthUrlResponse,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';
import Zernio from '@zernio/node';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

// In-memory cache for usage stats (TTL: 5 minutes)
const usageCache = new Map<string, { data: any; expiresAt: number }>();
const USAGE_CACHE_TTL = 5 * 60 * 1000;

export class ZernioBaseProvider
  extends SocialAbstract
  implements SocialProvider
{
  identifier: string;
  name: string;
  isBetweenSteps = false;
  scopes: string[] = [];
  editor = 'normal' as const;
  override hiddenFromList = true;

  constructor(
    protected readonly platform: string,
    protected readonly platformName: string,
    protected readonly charLimit: number
  ) {
    super();
    this.identifier = `zernio-${platform}`;
    this.name = `${platformName} (via Zernio)`;
  }

  maxLength() {
    return this.charLimit;
  }

  async generateAuthUrl(
    clientInformation?: ClientInformation
  ): Promise<GenerateAuthUrlResponse> {
    const state = makeId(20);
    const codeVerifier = makeId(10);
    const zernioApiKey = clientInformation?.instanceUrl;

    if (!zernioApiKey) {
      throw new Error(
        'Zernio API key not configured. Go to Settings > Zernio to configure it.'
      );
    }

    const zernio = new Zernio({ apiKey: zernioApiKey });
    const profileId = `postiz_${makeId(10)}`;
    const redirectUrl = `${process.env.FRONTEND_URL}/integrations/social/${this.identifier}`;

    const { data } = await zernio.connect.getConnectUrl({
      path: { platform: this.platform as any },
      query: {
        profileId,
        redirect_url: redirectUrl,
      },
    });

    await ioRedis.set(
      `zernio:${codeVerifier}`,
      JSON.stringify({ zernioApiKey, profileId }),
      'EX',
      3600
    );

    return {
      url: data?.authUrl || '',
      codeVerifier,
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }): Promise<AuthTokenDetails> {
    const zernioAccountId = params.code;

    const stateData = await ioRedis.get(`zernio:${params.codeVerifier}`);
    if (!stateData) {
      throw new Error('Session expired. Please try connecting again.');
    }

    const { zernioApiKey } = JSON.parse(stateData);
    const zernio = new Zernio({ apiKey: zernioApiKey });

    const { data } = await zernio.accounts.listAccounts();
    const account = (data?.accounts || []).find(
      (a: any) => a._id === zernioAccountId
    );

    // Zernio SDK doesn't provide profile pictures for accounts.
    // Use the platform icon as fallback.
    const picture =
      this.platform === 'youtube'
        ? '/icons/platforms/youtube.svg'
        : `/icons/platforms/${this.platform}.png`;

    return {
      id: zernioAccountId,
      name: account?.displayName || account?.username || `${this.platformName} Account`,
      accessToken: zernioApiKey,
      refreshToken: '',
      expiresIn: 999999999,
      picture,
      username: account?.username || account?.displayName || `${this.platform}_user`,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    return {
      id: '',
      name: '',
      accessToken: '',
      refreshToken: '',
      expiresIn: 999999999,
      picture: '',
      username: '',
    };
  }

  private async checkUsage(zernio: InstanceType<typeof Zernio>, apiKey: string) {
    const cached = usageCache.get(apiKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const { data: usage } = await zernio.usage.getUsageStats();
    usageCache.set(apiKey, {
      data: usage,
      expiresAt: Date.now() + USAGE_CACHE_TTL,
    });
    return usage;
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const zernio = new Zernio({ apiKey: accessToken });

    try {
      const usage = await this.checkUsage(zernio, accessToken);
      if (
        usage?.apiRequests &&
        usage.apiRequests.used >= usage.apiRequests.limit
      ) {
        throw new Error(
          `Zernio API request limit reached (${usage.apiRequests.used}/${usage.apiRequests.limit}). Upgrade your plan at zernio.com`
        );
      }
    } catch (err: any) {
      if (err?.message?.includes('limit reached')) {
        throw err;
      }
    }

    // Use the real Zernio accountId from customInstanceDetails if available,
    // otherwise fall back to internalId (backwards compat with old integrations).
    let realAccountId = id;
    if (integration.customInstanceDetails) {
      try {
        const details = JSON.parse(integration.customInstanceDetails);
        // Support both new (zernioAccountId) and legacy (lateAccountId) keys so
        // integrations migrated from Late keep working without touching the JSON.
        if (details.zernioAccountId) {
          realAccountId = details.zernioAccountId;
        } else if (details.lateAccountId) {
          realAccountId = details.lateAccountId;
        }
      } catch {}
    }

    const firstPost = postDetails[0];

    const mediaItems: Array<{ url: string }> = [];
    if (firstPost.media?.length) {
      for (const media of firstPost.media) {
        mediaItems.push({ url: media.path });
      }
    }

    const platformSpecificData = firstPost.settings || {};

    try {
      const { data } = await zernio.posts.createPost({
        body: {
          content: firstPost.message,
          mediaItems: mediaItems as any,
          platforms: [
            {
              platform: this.platform as any,
              accountId: realAccountId,
              platformSpecificData,
            },
          ],
          publishNow: true,
        },
      });

      const zernioPostId = data?.post?._id || '';

      // Poll Zernio API to verify the post was actually published on the platform.
      // Zernio accepts the post immediately but publishing may fail asynchronously
      // (e.g. expired token, account disconnected).
      if (zernioPostId) {
        const finalStatus = await this.pollPostStatus(zernio, zernioPostId);
        if (finalStatus === 'failed') {
          const errorMsg = await this.getPostErrorMessage(zernio, zernioPostId);
          throw new Error(
            errorMsg || `Post was sent to Zernio but failed to publish on ${this.platformName}. Check your Zernio dashboard for details.`
          );
        }
      }

      return [
        {
          id: firstPost.id,
          postId: zernioPostId,
          releaseURL: '',
          status: 'success',
        },
      ];
    } catch (err: any) {
      if (err?.status === 401) {
        throw new Error(
          'Zernio API key invalid or expired. Reconfigure in Settings > Zernio.'
        );
      }
      if (err?.status === 429) {
        throw new Error(
          'Zernio API rate limit reached. Please wait a few minutes.'
        );
      }
      throw err;
    }
  }

  private async pollPostStatus(
    zernio: InstanceType<typeof Zernio>,
    postId: string,
    maxAttempts = 10,
    intervalMs = 3000
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      try {
        const { data } = await zernio.posts.getPost({
          path: { postId },
        });
        const status = data?.post?.status;
        if (status === 'published' || status === 'failed' || status === 'partial') {
          return status;
        }
        // 'publishing' or 'scheduled' — keep polling
      } catch {
        // Ignore errors during polling, keep trying
      }
    }
    // Timed out — assume success since Zernio accepted the post
    return 'unknown';
  }

  private async getPostErrorMessage(
    zernio: InstanceType<typeof Zernio>,
    postId: string
  ): Promise<string | null> {
    try {
      const { data } = await zernio.logs.listLogs({
        query: {
          type: 'publishing',
          status: 'failed',
          search: postId,
          limit: 5,
        },
      });
      const logs = ((data as any)?.logs || []) as Array<any>;
      const failedLog = logs.find(
        (log) => log.status === 'failed' && (log.post_id === postId || log.postId === postId)
      ) || logs[0];
      return (
        failedLog?.error_message ||
        failedLog?.response?.errorMessage ||
        failedLog?.response?.rawBody ||
        null
      );
    } catch {
      return null;
    }
  }
}
