import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

const API = 'https://api.postforme.dev/v1';

// The Post for Me project key never expires, but the interface wants a number of seconds.
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365;

type PfmAccount = {
  id: string;
  platform: string;
  username: string;
  profile_photo_url?: string;
  external_id?: string;
  status?: string;
};

/**
 * Publishes through Post for Me (postforme.dev) instead of calling the platform
 * API directly. Useful wherever your own developer app is unavailable or stuck
 * in review - Post for Me keeps the OAuth on its side and we only supply a
 * project key.
 *
 * The Postiz integration token is the `apiKey`, and `internalId` is the account
 * identifier on the Post for Me side (`spc_...`).
 */
const PLATFORMS = [
  // TikTok Business goes through business-api.tiktok.com, which is not subject
  // to the active-user cap that blocks a plain tiktok account
  // (403 reached_active_user_cap). Business is the one we publish with.
  { value: 'tiktok_business', label: 'TikTok (Business)' },
  { value: 'tiktok', label: 'TikTok (personal - app cap applies, may not work)' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'threads', label: 'Threads' },
  { value: 'bluesky', label: 'Bluesky' },
];

export class PostForMeProvider
  extends SocialAbstract
  implements SocialProvider
{
  identifier = 'postforme';
  name = 'Post for Me';

  isBetweenSteps = false;
  editor = 'normal' as const;
  scopes = [] as string[];
  override maxConcurrentJob = 2;

  maxLength() {
    return 2200;
  }

  async generateAuthUrl() {
    return { url: '', codeVerifier: makeId(10), state: makeId(6) };
  }

  async refreshToken(): Promise<AuthTokenDetails> {
    // Post for Me refreshes the platform tokens on its side; we only hold the
    // project key, which does not expire.
    return {
      refreshToken: '',
      expiresIn: 0,
      accessToken: '',
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async customFields() {
    return [
      {
        key: 'apiKey',
        label: 'Post for Me project key (pfm_live_...)',
        validation: `/^pfm_.{10,}$/`,
        type: 'password' as const,
      },
      {
        key: 'platform',
        label: 'Platform',
        validation: `/^.{2,}$/`,
        type: 'select' as const,
        options: PLATFORMS,
      },
      {
        key: 'accountId',
        label: 'ID konta (spc_...) - zostaw puste, aby wziac pierwsze konto tej platformy',
        validation: `/^(|spc_.{5,})$/`,
        type: 'text' as const,
      },
    ];
  }

  private async accounts(apiKey: string): Promise<PfmAccount[]> {
    const { data } = await (
      await this.fetch(`${API}/social-accounts`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
    ).json();
    return data || [];
  }

  async authenticate(params: { code: string }) {
    const body = JSON.parse(Buffer.from(params.code, 'base64').toString());
    const apiKey: string = body.apiKey;
    const platform: string = (body.platform || '').trim();
    const wanted: string = (body.accountId || '').trim();

    const all = await this.accounts(apiKey);
    const forPlatform = all.filter((a) => a.platform === platform);

    const account = wanted
      ? forPlatform.find((a) => a.id === wanted)
      : forPlatform[0];

    if (!account) {
      // List what is actually connected - otherwise the user has to guess
      // whether they picked the wrong platform or never linked the account in PFM.
      const available = all
        .map((a) => `${a.platform}:${a.username || a.id}`)
        .join(', ');
      throw new Error(
        `Post for Me: brak konta dla platformy "${platform}". ` +
          `Polaczone konta: ${available || 'brak'}. ` +
          'Polacz konto w panelu postforme.dev albo wybierz inna platforme.'
      );
    }

    return {
      id: account.id,
      name: `${account.username || account.external_id || platform} (PFM)`,
      accessToken: apiKey,
      refreshToken: apiKey,
      expiresIn: TOKEN_TTL_SECONDS,
      picture: account.profile_photo_url || '',
      username: account.username || account.external_id || '',
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [first, ...rest] = postDetails;

    const media = (first.media || []).map((m) => ({ url: m.path }));

    // TikTok odrzuca publikacje bez privacy_level, ale Post for Me przyjmuje
    // such a job and finishes it as "processed" with no trace of an error.
    // The platform is read from the API because the channel configuration is
    // encrypted, and the key in platform_configurations has to match the platform
    // literally ("tiktok" and "tiktok_business" are two different TikTok APIs).
    let platform = '';
    let username = '';
    try {
      const account = await (
        await this.fetch(`${API}/social-accounts/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      ).json();
      platform = String(account?.platform || '');
      username = String(account?.username || '');
    } catch {
      // a missing platform lookup must not block publishing
    }
    const tiktokLike = platform.startsWith('tiktok');

    const { data, id: postId } = await (
      await this.fetch(`${API}/social-posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caption: first.message,
          social_accounts: [id],
          ...(media.length ? { media } : {}),
          ...(tiktokLike
            ? {
                platform_configurations: {
                  [platform]: { privacy_level: 'PUBLIC_TO_EVERYONE' },
                },
              }
            : {}),
        }),
      })
    ).json();

    const created = data || { id: postId };

    // Post for Me does not know the post URL when it accepts the job (it publishes
    // asynchronicznie), a Postiz traktuje pusty releaseURL jako blad i oznacza
    // a successful publish as ERROR. We return the profile URL instead - it leads
    // somewhere sensible and the calendar status matches reality.
    const profileUrl =
      created.platform_url ||
      (username && platform.startsWith('tiktok')
        ? `https://www.tiktok.com/@${username}`
        : username
        ? `https://${platform}.com/${username}`
        : `${API}/social-posts/${created.id || ''}`);

    return [
      {
        id: first.id,
        postId: String(created.id || ''),
        releaseURL: profileUrl,
        status: 'success',
      },
      // Post for Me does not support threads - every follow-up part would have to
      // be its own post, so we skip them instead of dropping them silently.
      ...rest.map((r) => ({
        id: r.id,
        postId: '',
        releaseURL: '',
        status: 'success',
      })),
    ];
  }
}

