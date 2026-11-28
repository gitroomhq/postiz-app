import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Redis } from 'ioredis';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

export interface PlatformFieldDefinition {
  key: string;
  label: string;
  secret: boolean;
  optional?: boolean;
}

export interface PlatformRedirectPath {
  path: string;
  redirectMeTo?: boolean;
}

export interface PlatformCredentialDefinition {
  id: string;
  name: string;
  providers: string[];
  redirectPaths: Array<string | PlatformRedirectPath>;
  developerPortalUrl: string;
  developerPortalLabel: string;
  notes: string;
  fields: PlatformFieldDefinition[];
  fallbackEnvSets?: string[][];
}

export interface PlatformCredentialStatus {
  id: string;
  name: string;
  providers: string[];
  redirectUris: string[];
  developerPortalUrl: string;
  developerPortalLabel: string;
  notes: string;
  configured: boolean;
  source: 'ui' | 'env' | 'none';
  fields: Array<{
    key: string;
    label: string;
    secret: boolean;
    optional?: boolean;
    hasValue: boolean;
    maskedPreview: string;
    source: 'ui' | 'env' | 'none';
  }>;
}

const REDIS_SYNC_CHANNEL = 'postr:platform-credentials:updated';

export const PLATFORM_CREDENTIAL_DEFINITIONS: PlatformCredentialDefinition[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn (Personal & Company Pages)',
    providers: ['linkedin', 'linkedin-page'],
    redirectPaths: [
      '/integrations/social/linkedin',
      '/integrations/social/linkedin-page',
    ],
    developerPortalUrl: 'https://www.linkedin.com/developers/apps',
    developerPortalLabel: 'LinkedIn Developer Portal',
    notes:
      'Enable "Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn" (plus Community Management API for Company Pages).',
    fields: [
      { key: 'LINKEDIN_CLIENT_ID', label: 'Client ID', secret: false },
      { key: 'LINKEDIN_CLIENT_SECRET', label: 'Client Secret', secret: true },
    ],
  },
  {
    id: 'meta_fb_ig',
    name: 'Facebook Pages & Instagram (Business)',
    providers: ['facebook', 'instagram'],
    redirectPaths: [
      '/integrations/social/facebook',
      '/integrations/social/instagram',
    ],
    developerPortalUrl: 'https://developers.facebook.com/apps',
    developerPortalLabel: 'Meta for Developers (Apps)',
    notes:
      'Meta Developer App ID & Secret used for Facebook Pages and Instagram via Facebook Business.',
    fields: [
      { key: 'FACEBOOK_APP_ID', label: 'App ID', secret: false },
      { key: 'FACEBOOK_APP_SECRET', label: 'App Secret', secret: true },
    ],
  },
  {
    id: 'instagram_standalone',
    name: 'Instagram (Standalone)',
    providers: ['instagram-standalone'],
    redirectPaths: [
      { path: '/integrations/social/instagram-standalone', redirectMeTo: true },
    ],
    developerPortalUrl: 'https://developers.facebook.com/apps',
    developerPortalLabel: 'Meta for Developers (Instagram API Setup)',
    notes: 'Meta Instagram API with Instagram Login app credentials.',
    fields: [
      { key: 'INSTAGRAM_APP_ID', label: 'Instagram App ID', secret: false },
      {
        key: 'INSTAGRAM_APP_SECRET',
        label: 'Instagram App Secret',
        secret: true,
      },
    ],
  },
  {
    id: 'threads',
    name: 'Threads',
    providers: ['threads'],
    redirectPaths: [
      { path: '/integrations/social/threads', redirectMeTo: true },
    ],
    developerPortalUrl: 'https://developers.facebook.com/apps',
    developerPortalLabel: 'Meta for Developers (Threads API)',
    notes: 'Meta Developer App credentials with Threads API enabled.',
    fields: [
      { key: 'THREADS_APP_ID', label: 'Threads App ID', secret: false },
      { key: 'THREADS_APP_SECRET', label: 'Threads App Secret', secret: true },
    ],
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    providers: ['x'],
    redirectPaths: ['/integrations/social/x'],
    developerPortalUrl: 'https://developer.twitter.com/en/portal',
    developerPortalLabel: 'X Developer Portal',
    notes: 'X Developer Portal Consumer API Key & Secret (OAuth 1.0a).',
    fields: [
      { key: 'X_API_KEY', label: 'API Key', secret: false },
      { key: 'X_API_SECRET', label: 'API Secret', secret: true },
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    providers: ['youtube'],
    redirectPaths: ['/integrations/social/youtube'],
    developerPortalUrl: 'https://console.cloud.google.com/apis/credentials',
    developerPortalLabel: 'Google Cloud Console (Credentials)',
    notes:
      'Google Cloud OAuth 2.0 Client ID & Secret with YouTube Data API v3 enabled.',
    fields: [
      { key: 'YOUTUBE_CLIENT_ID', label: 'Google Client ID', secret: false },
      {
        key: 'YOUTUBE_CLIENT_SECRET',
        label: 'Google Client Secret',
        secret: true,
      },
    ],
  },
  {
    id: 'gmb',
    name: 'Google Business Profile (GMB)',
    providers: ['gmb'],
    redirectPaths: ['/integrations/social/gmb'],
    developerPortalUrl: 'https://console.cloud.google.com/apis/credentials',
    developerPortalLabel: 'Google Cloud Console (Credentials)',
    notes:
      'Optional if your YouTube Google OAuth app already includes Google Business Profile scopes; otherwise enter dedicated GMB OAuth keys.',
    fallbackEnvSets: [['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET']],
    fields: [
      {
        key: 'GOOGLE_GMB_CLIENT_ID',
        label: 'Google GMB Client ID',
        secret: false,
      },
      {
        key: 'GOOGLE_GMB_CLIENT_SECRET',
        label: 'Google GMB Client Secret',
        secret: true,
      },
    ],
  },
  {
    id: 'reddit',
    name: 'Reddit',
    providers: ['reddit'],
    redirectPaths: ['/integrations/social/reddit'],
    developerPortalUrl: 'https://www.reddit.com/prefs/apps',
    developerPortalLabel: 'Reddit App Preferences',
    notes: 'Reddit App Preferences (web app) Client ID & Secret.',
    fields: [
      { key: 'REDDIT_CLIENT_ID', label: 'Client ID', secret: false },
      { key: 'REDDIT_CLIENT_SECRET', label: 'Client Secret', secret: true },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    providers: ['tiktok'],
    redirectPaths: [
      { path: '/integrations/social/tiktok', redirectMeTo: true },
    ],
    developerPortalUrl: 'https://developers.tiktok.com',
    developerPortalLabel: 'TikTok for Developers',
    notes: 'TikTok for Developers Login Kit Client Key & Client Secret.',
    fields: [
      { key: 'TIKTOK_CLIENT_ID', label: 'Client Key', secret: false },
      { key: 'TIKTOK_CLIENT_SECRET', label: 'Client Secret', secret: true },
    ],
  },
  {
    id: 'tiktok_business',
    name: 'TikTok Business',
    providers: ['tiktok-business'],
    redirectPaths: [
      { path: '/integrations/social/tiktok-business/', redirectMeTo: true },
    ],
    developerPortalUrl: 'https://business-api.tiktok.com',
    developerPortalLabel: 'TikTok Business API Portal',
    notes: 'TikTok Business API app Client ID & Secret.',
    fields: [
      { key: 'TIKTOK_BUSINESS_CLIENT_ID', label: 'Client ID', secret: false },
      {
        key: 'TIKTOK_BUSINESS_CLIENT_SECRET',
        label: 'Client Secret',
        secret: true,
      },
    ],
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    providers: ['pinterest'],
    redirectPaths: ['/integrations/social/pinterest'],
    developerPortalUrl: 'https://developers.pinterest.com',
    developerPortalLabel: 'Pinterest Developers',
    notes: 'Pinterest Developers App ID & App Secret.',
    fields: [
      { key: 'PINTEREST_CLIENT_ID', label: 'App ID', secret: false },
      { key: 'PINTEREST_CLIENT_SECRET', label: 'App Secret', secret: true },
    ],
  },
  {
    id: 'discord',
    name: 'Discord',
    providers: ['discord'],
    redirectPaths: ['/integrations/social/discord'],
    developerPortalUrl: 'https://discord.com/developers/applications',
    developerPortalLabel: 'Discord Developer Portal',
    notes: 'Discord Developer Portal OAuth2 Client ID, Secret, and Bot Token.',
    fields: [
      { key: 'DISCORD_CLIENT_ID', label: 'Client ID', secret: false },
      { key: 'DISCORD_CLIENT_SECRET', label: 'Client Secret', secret: true },
      { key: 'DISCORD_BOT_TOKEN_ID', label: 'Bot Token', secret: true },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    providers: ['slack'],
    redirectPaths: [{ path: '/integrations/social/slack', redirectMeTo: true }],
    developerPortalUrl: 'https://api.slack.com/apps',
    developerPortalLabel: 'Slack API Apps',
    notes: 'Slack App OAuth2 Client ID & Client Secret.',
    fields: [
      { key: 'SLACK_ID', label: 'Client ID', secret: false },
      { key: 'SLACK_SECRET', label: 'Client Secret', secret: true },
    ],
  },
  {
    id: 'mastodon',
    name: 'Mastodon',
    providers: ['mastodon'],
    redirectPaths: ['/integrations/social/mastodon'],
    developerPortalUrl: 'https://mastodon.social/settings/applications',
    developerPortalLabel: 'Mastodon Development Applications',
    notes:
      'Mastodon OAuth application Client Key & Secret (defaults to https://mastodon.social if instance URL is omitted).',
    fields: [
      { key: 'MASTODON_CLIENT_ID', label: 'Client Key / ID', secret: false },
      { key: 'MASTODON_CLIENT_SECRET', label: 'Client Secret', secret: true },
      {
        key: 'MASTODON_URL',
        label: 'Instance URL (Optional)',
        secret: false,
        optional: true,
      },
    ],
  },
  {
    id: 'dribbble',
    name: 'Dribbble',
    providers: ['dribbble'],
    redirectPaths: ['/integrations/social/dribbble'],
    developerPortalUrl: 'https://dribbble.com/account/applications/new',
    developerPortalLabel: 'Dribbble Applications',
    notes: 'Dribbble Registered Application Client ID & Client Secret.',
    fields: [
      { key: 'DRIBBBLE_CLIENT_ID', label: 'Client ID', secret: false },
      { key: 'DRIBBBLE_CLIENT_SECRET', label: 'Client Secret', secret: true },
    ],
  },
  {
    id: 'twitch',
    name: 'Twitch',
    providers: ['twitch'],
    redirectPaths: ['/integrations/social/twitch'],
    developerPortalUrl: 'https://dev.twitch.tv/console/apps',
    developerPortalLabel: 'Twitch Developer Console',
    notes: 'Twitch Developer Console Client ID & Client Secret.',
    fields: [
      { key: 'TWITCH_CLIENT_ID', label: 'Client ID', secret: false },
      { key: 'TWITCH_CLIENT_SECRET', label: 'Client Secret', secret: true },
    ],
  },
  {
    id: 'kick',
    name: 'Kick',
    providers: ['kick'],
    redirectPaths: ['/integrations/social/kick'],
    developerPortalUrl: 'https://dev.kick.com',
    developerPortalLabel: 'Kick Developer Portal',
    notes: 'Kick Developer App Client ID & Secret.',
    fields: [
      { key: 'KICK_CLIENT_ID', label: 'Client ID', secret: false },
      { key: 'KICK_SECRET', label: 'Client Secret', secret: true },
    ],
  },
  {
    id: 'tumblr',
    name: 'Tumblr',
    providers: ['tumblr'],
    redirectPaths: ['/integrations/social/tumblr'],
    developerPortalUrl: 'https://www.tumblr.com/oauth/apps',
    developerPortalLabel: 'Tumblr OAuth Applications',
    notes: 'Tumblr OAuth2 Consumer Key & Consumer Secret.',
    fields: [
      { key: 'TUMBLR_CLIENT_ID', label: 'Client ID', secret: false },
      { key: 'TUMBLR_CLIENT_SECRET', label: 'Client Secret', secret: true },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    providers: ['telegram'],
    redirectPaths: [],
    developerPortalUrl: 'https://t.me/BotFather',
    developerPortalLabel: 'Telegram @BotFather',
    notes:
      'Telegram Bot Token from @BotFather. Restart the POSTR container after changing this token so the bot client reinitializes.',
    fields: [{ key: 'TELEGRAM_TOKEN', label: 'Bot Token', secret: true }],
  },
  {
    id: 'farcaster',
    name: 'Farcaster (Neynar)',
    providers: ['wrapcast'],
    redirectPaths: [],
    developerPortalUrl: 'https://dev.neynar.com',
    developerPortalLabel: 'Neynar Developer Portal',
    notes:
      'Neynar API & Farcaster signer credentials. Restart the POSTR container after updating NEYNAR_SECRET_KEY.',
    fields: [
      { key: 'NEYNAR_SECRET_KEY', label: 'Neynar API Key', secret: true },
      { key: 'NEYNAR_CLIENT_ID', label: 'Neynar Client ID', secret: false },
      { key: 'NEYNAR_APP_FID', label: 'App FID', secret: false },
      { key: 'NEYNAR_APP_MNEMONIC', label: 'App Mnemonic', secret: true },
    ],
  },
  {
    id: 'vk',
    name: 'VK',
    providers: ['vk'],
    redirectPaths: [{ path: '/integrations/social/vk', redirectMeTo: true }],
    developerPortalUrl: 'https://id.vk.com/about/business/go',
    developerPortalLabel: 'VK ID Developer Dashboard',
    notes: 'VK ID application App ID (PKCE OAuth flow).',
    fields: [{ key: 'VK_ID', label: 'VK App ID', secret: false }],
  },
  {
    id: 'whop',
    name: 'Whop',
    providers: ['whop'],
    redirectPaths: ['/integrations/social/whop'],
    developerPortalUrl: 'https://whop.com/dashboard/developer',
    developerPortalLabel: 'Whop Developer Dashboard',
    notes: 'Whop OAuth application Client ID (PKCE OAuth flow).',
    fields: [{ key: 'WHOP_CLIENT_ID', label: 'Client ID', secret: false }],
  },
  {
    id: 'mewe',
    name: 'MeWe',
    providers: ['mewe'],
    redirectPaths: ['/integrations/social/mewe'],
    developerPortalUrl: 'https://developer.mewe.com',
    developerPortalLabel: 'MeWe Developer Portal',
    notes: 'MeWe Developer App ID & API Key (host defaults to https://mewe.com).',
    fields: [
      { key: 'MEWE_APP_ID', label: 'App ID', secret: false },
      { key: 'MEWE_API_KEY', label: 'API Key', secret: true },
      {
        key: 'MEWE_HOST',
        label: 'MeWe Host (Optional)',
        secret: false,
        optional: true,
      },
    ],
  },
];

const ALLOWED_KEYS = new Set(
  PLATFORM_CREDENTIAL_DEFINITIONS.flatMap((d) => d.fields.map((f) => f.key))
);

/**
 * Manages admin-configured OAuth app credentials encrypted on disk and synced
 * into process.env across backend and orchestrator processes via Redis pub/sub.
 */
@Injectable()
export class PlatformCredentialsService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PlatformCredentialsService.name);
  private static readonly baselineEnv: Record<string, string> = {};
  private static baselineCaptured = false;
  private subscriber?: Redis;

  constructor() {
    PlatformCredentialsService.captureBaseline();
  }

  private static captureBaseline() {
    if (PlatformCredentialsService.baselineCaptured) {
      return;
    }
    for (const key of ALLOWED_KEYS) {
      PlatformCredentialsService.baselineEnv[key] = process.env[key] || '';
    }
    PlatformCredentialsService.baselineCaptured = true;
  }

  private getStorePath(): string {
    if (process.env.PLATFORM_CREDENTIALS_PATH) {
      return process.env.PLATFORM_CREDENTIALS_PATH;
    }
    if (fs.existsSync('/config')) {
      return '/config/platform-credentials.enc.json';
    }
    return path.join(process.cwd(), 'config', 'platform-credentials.enc.json');
  }

  private deriveKey(): Buffer {
    const secret = process.env.JWT_SECRET || 'postr-default-secret';
    return crypto.scryptSync(secret, 'postr-platform-credentials-v1', 32);
  }

  private encryptMap(values: Record<string, string>): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.deriveKey(), iv);
    const plaintext = Buffer.from(JSON.stringify(values), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return JSON.stringify(
      {
        v: 1,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        data: encrypted.toString('base64'),
      },
      null,
      2
    );
  }

  private decryptMap(raw: string): Record<string, string> {
    const parsed = JSON.parse(raw);
    const iv = Buffer.from(parsed.iv, 'base64');
    const tag = Buffer.from(parsed.tag, 'base64');
    const data = Buffer.from(parsed.data, 'base64');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.deriveKey(),
      iv
    );
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]);
    const obj = JSON.parse(decrypted.toString('utf8'));
    const sanitized: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj || {})) {
      if (ALLOWED_KEYS.has(k) && typeof v === 'string' && v.trim()) {
        sanitized[k] = v.trim();
      }
    }
    return sanitized;
  }

  private readStoredOverrides(): Record<string, string> {
    const filePath = this.getStorePath();
    if (!fs.existsSync(filePath)) {
      return {};
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return this.decryptMap(raw);
    } catch (err: any) {
      this.logger.warn(
        `Unable to read platform credentials store: ${err?.message || err}`
      );
      return {};
    }
  }

  private writeStoredOverrides(values: Record<string, string>) {
    const filePath = this.getStorePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, this.encryptMap(values), {
      encoding: 'utf8',
      mode: 0o600,
    });
  }

  private applyToProcessEnv(overrides: Record<string, string>) {
    PlatformCredentialsService.captureBaseline();
    for (const key of ALLOWED_KEYS) {
      if (overrides[key]) {
        process.env[key] = overrides[key];
      } else {
        process.env[key] = PlatformCredentialsService.baselineEnv[key] || '';
      }
    }
  }

  async onModuleInit() {
    this.reloadFromDisk();
    if (process.env.REDIS_URL && typeof ioRedis.duplicate === 'function') {
      try {
        this.subscriber = ioRedis.duplicate();
        await this.subscriber.subscribe(REDIS_SYNC_CHANNEL);
        this.subscriber.on('message', (channel: string) => {
          if (channel === REDIS_SYNC_CHANNEL) {
            this.reloadFromDisk();
          }
        });
      } catch (err: any) {
        this.logger.warn(
          `Redis sync subscription skipped: ${err?.message || err}`
        );
      }
    }
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit().catch(() => {});
    }
  }

  reloadFromDisk() {
    const overrides = this.readStoredOverrides();
    this.applyToProcessEnv(overrides);
  }

  private async notifyWorkers() {
    if (process.env.REDIS_URL && typeof ioRedis.publish === 'function') {
      await ioRedis
        .publish(REDIS_SYNC_CHANNEL, Date.now().toString())
        .catch(() => {});
    }
  }

  private maskValue(value: string, isSecret: boolean): string {
    if (!value) {
      return '';
    }
    if (!isSecret && value.length <= 10) {
      return `${value.slice(0, 2)}••••${value.slice(-2)}`;
    }
    const visible = value.slice(-4);
    return `••••••••${visible}`;
  }

  static isProviderConfigured(providerIdentifier: string): boolean {
    const def = PLATFORM_CREDENTIAL_DEFINITIONS.find((d) =>
      d.providers.includes(providerIdentifier)
    );
    if (!def) {
      return true;
    }
    const directConfigured = def.fields
      .filter((f) => !f.optional)
      .every((f) => Boolean((process.env[f.key] || '').trim()));
    if (directConfigured) {
      return true;
    }
    return Boolean(
      def.fallbackEnvSets?.some((group) =>
        group.every((k) => Boolean((process.env[k] || '').trim()))
      )
    );
  }

  getStatuses(): PlatformCredentialStatus[] {
    const overrides = this.readStoredOverrides();
    const frontendUrl = (
      process.env.FRONTEND_URL || 'http://localhost:4007'
    ).replace(/\/+$/, '');
    const isHttpLocal = !frontendUrl.includes('https');

    return PLATFORM_CREDENTIAL_DEFINITIONS.map((def) => {
      const fields = def.fields.map((f) => {
        const uiVal = overrides[f.key] || '';
        const envVal = PlatformCredentialsService.baselineEnv[f.key] || '';
        const effective = uiVal || envVal || (process.env[f.key] || '');
        const source: 'ui' | 'env' | 'none' = uiVal
          ? 'ui'
          : envVal
          ? 'env'
          : 'none';
        return {
          key: f.key,
          label: f.label,
          secret: f.secret,
          optional: f.optional,
          hasValue: Boolean(effective.trim()),
          maskedPreview: this.maskValue(effective.trim(), f.secret),
          source,
        };
      });

      const directConfigured = fields
        .filter((f) => !f.optional)
        .every((f) => f.hasValue);
      const fallbackConfigured = Boolean(
        def.fallbackEnvSets?.some((group) =>
          group.every((k) => Boolean((process.env[k] || '').trim()))
        )
      );
      const configured = directConfigured || fallbackConfigured;
      const source: 'ui' | 'env' | 'none' = fields.some(
        (f) => f.source === 'ui'
      )
        ? 'ui'
        : configured
        ? 'env'
        : 'none';

      const redirectUris = def.redirectPaths.map((entry) => {
        const normalized =
          typeof entry === 'string' ? { path: entry } : entry;
        const prefix =
          normalized.redirectMeTo && isHttpLocal
            ? `https://redirectmeto.com/${frontendUrl}`
            : frontendUrl;
        return `${prefix}${normalized.path}`;
      });

      return {
        id: def.id,
        name: def.name,
        providers: def.providers,
        redirectUris,
        developerPortalUrl: def.developerPortalUrl,
        developerPortalLabel: def.developerPortalLabel,
        notes: def.notes,
        configured,
        source,
        fields,
      };
    });
  }

  async updatePlatformCredentials(
    platformId: string,
    values: Record<string, string>
  ): Promise<PlatformCredentialStatus[]> {
    const def = PLATFORM_CREDENTIAL_DEFINITIONS.find((d) => d.id === platformId);
    if (!def) {
      throw new Error(`Unknown platform: ${platformId}`);
    }

    const current = this.readStoredOverrides();
    for (const field of def.fields) {
      if (Object.prototype.hasOwnProperty.call(values || {}, field.key)) {
        const incoming = (values[field.key] || '').trim();
        if (incoming) {
          current[field.key] = incoming;
        }
      }
    }

    this.writeStoredOverrides(current);
    this.applyToProcessEnv(current);
    await this.notifyWorkers();
    return this.getStatuses();
  }

  async clearPlatformCredentials(
    platformId: string
  ): Promise<PlatformCredentialStatus[]> {
    const def = PLATFORM_CREDENTIAL_DEFINITIONS.find((d) => d.id === platformId);
    if (!def) {
      throw new Error(`Unknown platform: ${platformId}`);
    }

    const current = this.readStoredOverrides();
    for (const field of def.fields) {
      delete current[field.key];
    }

    this.writeStoredOverrides(current);
    this.applyToProcessEnv(current);
    await this.notifyWorkers();
    return this.getStatuses();
  }
}
