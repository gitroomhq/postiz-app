import {
  AnalyticsData,
  AuthTokenDetails,
  PendingCheckResponse,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import dayjs from 'dayjs';
import { makeSecureId } from '@gitroom/nestjs-libraries/services/make.secure.id';
import {
  BadBody,
  Disconnect,
  RefreshToken,
  SocialAbstract,
  ValidityMedia,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { TikTokDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tiktok.dto';
import { timer } from '@gitroom/helpers/utils/timer';
import { Integration } from '@prisma/client';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';
// postmonster: TikTok Direct Post audit modules (PRD 8.2)
import {
  TikTokCantPostError,
  TikTokCreatorInfo,
  TikTokPostSettings,
  isTikTokVideoPath,
  validateTikTokSettings,
  validateTikTokStaticSettings,
} from '@gitroom/nestjs-libraries/postmonster/tiktok/tiktok.validation';
import {
  isTikTokCantPostCode,
  mapTikTokErrorBody,
  mapTikTokErrorCode,
} from '@gitroom/nestjs-libraries/postmonster/tiktok/tiktok.errors';
import {
  creatorInfoCacheKey,
  getCreatorInfoCache,
  setCreatorInfoCache,
} from '@gitroom/nestjs-libraries/postmonster/tiktok/tiktok.creator-info.cache';

@Rules(
  [
    'TikTok can have one video or one picture or multiple pictures, it cannot be without an attachment.',
    'The post is always published directly to the TikTok account (Direct Post).',
    'privacy_level is required, has no default and must be one of the privacy_level_options of the connected account. Branded content cannot be combined with private (SELF_ONLY) visibility.',
    'duet and stitch apply to video posts only, photo posts only take comments. All interaction settings default to off.',
  ].join(' ')
)
export class TiktokProvider extends SocialAbstract implements SocialProvider {
  identifier = 'tiktok';
  name = 'Tiktok';
  isBetweenSteps = false;
  convertToJPEG = true;
  // postmonster: minimal scopes for the Content Posting audit (PRD 8.1)
  scopes = ['user.info.basic', 'video.publish'];
  override maxConcurrentJob = 10000;
  dto = TikTokDto;
  editor = 'normal' as const;
  // postmonster: video caption limit, UTF-16 runes (PRD TT-04)
  maxLength() {
    return 2200;
  }

  override async checkValidity(
    items: Array<ValidityMedia[]>,
    settings?: TikTokDto
  ): Promise<string | true> {
    // postmonster: static settings rules before media checks (PRD TT-05/08/10/22)
    const settingsErrors = validateTikTokStaticSettings(
      (settings || {}) as TikTokPostSettings,
      this.isAudited()
    );
    if (settingsErrors.length) {
      return settingsErrors[0];
    }

    const [firstItems] = items ?? [];
    if ((firstItems?.length ?? 0) === 0) {
      return 'No video / images selected';
    }
    // postmonster: mp4-only heuristic upstream treated MOV/WebM as photos
    if (
      (firstItems?.length ?? 0) > 1 &&
      firstItems?.some((p) => isTikTokVideoPath(p?.path))
    ) {
      return 'Only pictures are supported when selecting multiple items';
    } else if (
      firstItems?.length !== 1 &&
      isTikTokVideoPath(firstItems?.[0]?.path)
    ) {
      return 'You need one media';
    }

    // TikTok fails the whole photo post when a single image is oversized, and
    // the status only says `picture_size_check_failed` without naming it.
    if (firstItems?.every((p) => !isTikTokVideoPath(p?.path))) {
      const dimensions = await Promise.all(
        firstItems?.map((p) => this.getImageDimensions(p?.path)) ?? []
      );
      const tooBig = dimensions.findIndex(
        (p) => Math.min(p?.width ?? 0, p?.height ?? 0) > 1080
      );
      if (tooBig > -1) {
        return `Image ${tooBig + 1} is ${dimensions[tooBig]?.width}x${
          dimensions[tooBig]?.height
        }, TikTok allows a maximum of 1080px on the shorter side`;
      }
    }
    return true;
  }

  override handleErrors(body: string):
    | {
        type: 'refresh-token' | 'bad-body' | 'disconnect';
        value: string;
      }
    | undefined {
    // postmonster: shared TikTok error table (PRD TT-20) takes precedence; the
    // legacy per-code branches below stay as fallback for codes outside it.
    const mapped = mapTikTokErrorBody(body);
    if (mapped) {
      const type =
        mapped.code === 'access_token_invalid'
          ? ('refresh-token' as const)
          : mapped.action === 'reconnect'
            ? ('disconnect' as const)
            : ('bad-body' as const);
      return { type, value: mapped.message };
    }

    // Authentication/Authorization errors - require re-authentication
    if (body.indexOf('access_token_invalid') > -1) {
      return {
        type: 'refresh-token' as const,
        value:
          'Access token invalid, please re-authenticate your TikTok account',
      };
    }

    if (body.indexOf('scope_not_authorized') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'Missing required permissions, please re-authenticate with all scopes',
      };
    }

    if (body.indexOf('scope_permission_missed') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Additional permissions required, please re-authenticate',
      };
    }

    // Rate limiting errors
    if (body.indexOf('rate_limit_exceeded') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'TikTok API rate limit exceeded, please try again later',
      };
    }

    if (body.indexOf('file_format_check_failed') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'File format is invalid, please check video specifications',
      };
    }

    if (body.indexOf('app_version_check_failed') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'In order to use the TikTok upload feature, you have to update your app to the latest version',
      };
    }

    if (body.indexOf('duration_check_failed') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Video duration is invalid, please check video specifications',
      };
    }

    if (body.indexOf('frame_rate_check_failed') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Video frame rate is invalid, please check video specifications',
      };
    }

    if (body.indexOf('video_pull_failed') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Failed to pull video from URL, please check the URL',
      };
    }

    if (body.indexOf('photo_pull_failed') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Failed to pull photo from URL, please check the URL',
      };
    }

    if (body.indexOf('spam_risk_user_banned_from_posting') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'Account banned from posting, please check TikTok account status',
      };
    }

    if (body.indexOf('spam_risk_text') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'TikTok detected potential spam in the post text',
      };
    }

    if (body.indexOf('spam_risk_too_many_posts') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'TikTok says your daily post limit reached, please try again tomorrow',
      };
    }

    if (body.indexOf('spam_risk_too_many_pending_share') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'TikTok limits pending posts to 5 within any 24-hour period. Please check your TikTok inbox in the TikTok mobile app and try again after 24 hours.',
      };
    }

    if (body.indexOf('spam_risk_user_banned_from_posting') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'Account banned from posting, please check TikTok account status',
      };
    }

    if (body.indexOf('spam_risk') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'TikTok detected potential spam',
      };
    }

    // TikTok limits how many users of this app can post per day: refreshing
    // the token cannot help, the channel must be re-connected (and can be
    // migrated to another app via MIGRATE_PROVIDERS).
    if (body.indexOf('reached_active_user_cap') > -1) {
      return {
        type: 'disconnect' as const,
        value:
          'TikTok daily user limit reached, please re-connect your account',
      };
    }

    if (
      body.indexOf('unaudited_client_can_only_post_to_private_accounts') > -1
    ) {
      return {
        type: 'bad-body' as const,
        value: 'App not approved for public posting, contact support',
      };
    }

    if (body.indexOf('url_ownership_unverified') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'You have to upload the picture/video to Postmonster when sending a URL',
      };
    }

    if (body.indexOf('privacy_level_option_mismatch') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Privacy level mismatch, please check privacy settings',
      };
    }

    // Content/Format validation errors
    if (body.indexOf('invalid_file_upload') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Invalid file format or specifications not met',
      };
    }

    if (body.indexOf('invalid_params') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Invalid request parameters, please check content format',
      };
    }

    // Server errors
    if (body.indexOf('internal') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'There is a problem with TikTok servers, please try again later',
      };
    }

    // Generic TikTok API errors
    if (body.indexOf('picture_size_check_failed') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'Media size not supported by TikTok: images up to 1080px on the shorter side, videos at least 360px on both sides',
      };
    }

    if (body.indexOf('TikTok API error') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'TikTok API error, please try again',
      };
    }

    // Fall back to parent class error handling
    return undefined;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const value = {
      client_key: process.env.TIKTOK_CLIENT_ID!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    };

    const { access_token, refresh_token, ...all } = await (
      await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        body: new URLSearchParams(value).toString(),
      })
    ).json();

    const {
      data: {
        user: { avatar_url, display_name, open_id },
      },
    } = await (
      await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,union_id',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
    ).json();

    // postmonster: username comes from creator_info/query - the user/info
    // username field needs the user.info.username scope we no longer request
    // (PRD 8.1). A capped account can still connect: the composer shows the
    // TT-02 state from creator_info later.
    let username = '';
    try {
      username = (await this.queryCreatorInfo(access_token)).creator_username;
    } catch {
      username = '';
    }

    return {
      refreshToken: refresh_token,
      expiresIn: dayjs().add(23, 'hours').unix() - dayjs().unix(),
      accessToken: access_token,
      id: open_id.replace(/-/g, ''),
      name: display_name,
      picture: avatar_url || '',
      username: username,
    };
  }

  // postmonster: revoke the TikTok grant on Disconnect (PRD 8.3)
  // https://developers.tiktok.com/doc/authentication/
  async revokeToken(accessToken: string): Promise<void> {
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/revoke/', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_ID!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        token: accessToken,
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`TikTok revoke failed with status ${response.status}`);
    }
  }

  async generateAuthUrl() {
    const state = makeSecureId(16);

    return {
      url:
        'https://www.tiktok.com/v2/auth/authorize/' +
        `?client_key=${process.env.TIKTOK_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(
          `${
            process?.env?.FRONTEND_URL?.indexOf('https') === -1
              ? 'https://redirectmeto.com/'
              : ''
          }${process?.env?.FRONTEND_URL}/integrations/social/tiktok`
        )}` +
        `&state=${state}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(this.scopes.join(','))}`,
      codeVerifier: state,
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const value = {
      client_key: process.env.TIKTOK_CLIENT_ID!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code: params.code,
      grant_type: 'authorization_code',
      code_verifier: params.codeVerifier,
      redirect_uri: `${
        process?.env?.FRONTEND_URL?.indexOf('https') === -1
          ? 'https://redirectmeto.com/'
          : ''
      }${process?.env?.FRONTEND_URL}/integrations/social/tiktok`,
    };

    const { access_token, refresh_token, scope } = await (
      await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        body: new URLSearchParams(value).toString(),
      })
    ).json();

    this.checkScopes(this.scopes, scope);

    const {
      data: {
        user: { avatar_url, display_name, open_id },
      },
    } = await (
      await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,union_id',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
    ).json();

    // postmonster: username comes from creator_info/query - the user/info
    // username field needs the user.info.username scope we no longer request
    // (PRD 8.1). A capped account can still connect: the composer shows the
    // TT-02 state from creator_info later.
    let username = '';
    try {
      username = (await this.queryCreatorInfo(access_token)).creator_username;
    } catch {
      username = '';
    }

    return {
      id: open_id.replace(/-/g, ''),
      name: display_name,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: dayjs().add(23, 'hours').unix() - dayjs().unix(),
      picture: avatar_url,
      username: username,
    };
  }

  // postmonster: TIKTOK_AUDITED turns the unaudited-client restrictions
  // (PRD TT-18/TT-22) off once the app passes the TikTok content audit.
  private isAudited(): boolean {
    return String(process.env.TIKTOK_AUDITED || '').toLowerCase() === 'true';
  }

  // postmonster: TT-01 - creator_info/query returns the account profile, the
  // available privacy_level_options, the interaction switches and the video
  // duration limit. Cached in-process for up to 60 seconds (API limit is
  // 20 requests per minute per token). Throws TikTokCantPostError on the
  // "can not post right now" codes - they arrive as error.code with HTTP 200
  // (TT-02).
  async queryCreatorInfo(accessToken: string): Promise<TikTokCreatorInfo> {
    const key = creatorInfoCacheKey(this.identifier, accessToken);
    const cached = getCreatorInfoCache(key);
    if (cached) {
      return cached;
    }

    let body: any;
    try {
      body = await (
        await this.fetch(
          'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=UTF-8',
              Authorization: `Bearer ${accessToken}`,
            },
          },
          '',
          0,
          true
        )
      ).json();
    } catch (err) {
      if (err instanceof RefreshToken || err instanceof Disconnect) {
        throw err;
      }
      throw new BadBody(
        'tiktok-creator-info',
        '{}',
        Buffer.from('{}'),
        'Could not load TikTok account info. Please try again.'
      );
    }

    const error = body?.error;
    if (error?.code && error.code !== 'ok') {
      if (isTikTokCantPostCode(error.code)) {
        throw new TikTokCantPostError(error.code);
      }
      const handleError = this.handleErrors(JSON.stringify(body));
      if (handleError?.type === 'refresh-token') {
        throw new RefreshToken(
          'tiktok-creator-info',
          JSON.stringify(body),
          '',
          handleError.value
        );
      }
      if (handleError?.type === 'disconnect') {
        throw new Disconnect(
          'tiktok-creator-info',
          JSON.stringify(body),
          '',
          handleError.value
        );
      }
      throw new BadBody(
        'tiktok-creator-info',
        JSON.stringify(body),
        Buffer.from(JSON.stringify(body)),
        handleError?.value || 'Could not load TikTok account info.'
      );
    }

    const data = body?.data || {};
    const creator: TikTokCreatorInfo = {
      creator_avatar_url: data.creator_avatar_url || '',
      creator_username: data.creator_username || '',
      creator_nickname: data.creator_nickname || '',
      privacy_level_options: data.privacy_level_options || [],
      comment_disabled: !!data.comment_disabled,
      duet_disabled: !!data.duet_disabled,
      stitch_disabled: !!data.stitch_disabled,
      max_video_post_duration_sec: data.max_video_post_duration_sec || 0,
    };
    setCreatorInfoCache(key, creator);
    return creator;
  }

  async maxVideoLength(accessToken: string) {
    const creator = await this.queryCreatorInfo(accessToken);
    return {
      maxDurationSeconds: creator.max_video_post_duration_sec,
    };
  }

  // Single status check for a publish_id, no loops and no timers: `post` returns
  // a `pending` PostResponse right after the upload, and the post workflow polls
  // this method with durable timers, so a stuck/retried check can never re-run
  // the publish and duplicate the post.
  //
  // postmonster (PRD TT-15): real API calls follow an exponential backoff
  // (5s, 10s, 20s ... capped at 5 minutes; the status API allows 30 req/min)
  // while the workflow keeps ticking every 20 seconds for up to 30 minutes.
  // Statuses map to the PRD 7.3 model: PROCESSING_* -> still publishing,
  // PUBLISH_COMPLETE -> Published, FAILED -> Failed with a mapped fail_reason
  // (TT-20).
  override async checkPostStatus(
    accessToken: string,
    pendingData: {
      publishId: string;
      checks?: number;
      nextCheckAt?: number;
    },
    integration: Integration
  ): Promise<PendingCheckResponse> {
    const now = Date.now();
    if (pendingData.nextCheckAt && now < pendingData.nextCheckAt) {
      // backoff window: no API call, just tell the workflow to keep waiting
      return { status: 'pending', pendingData };
    }

    const checks = (pendingData.checks || 0) + 1;
    const nextPending = {
      publishId: pendingData.publishId,
      checks,
      nextCheckAt: now + Math.min(5000 * Math.pow(2, checks - 1), 5 * 60 * 1000),
    };

    let post: any;
    try {
      post = await (
        await this.fetch(
          'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=UTF-8',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              publish_id: pendingData.publishId,
            }),
          },
          '',
          0,
          true
        )
      ).json();
    } catch (err) {
      if (err instanceof RefreshToken || err instanceof Disconnect) {
        throw err;
      }

      // Transient API error while checking the status: the post may already
      // be live, so keep polling instead of failing it - if the API stays
      // broken the caller exhausts its checks and warns the user properly.
      return { status: 'pending', pendingData: nextPending };
    }

    const { status, fail_reason, publicaly_available_post_id } =
      post?.data || {};

    if (status === 'PUBLISH_COMPLETE') {
      // an empty array is truthy, so index it once and branch on the value;
      // publicaly_available_post_id (sic) only arrives for public posts after
      // moderation - a private post is Published without a link (PRD TT-15)
      const publicPostId = publicaly_available_post_id?.[0];

      return {
        status: 'completed',
        releaseURL: !publicPostId
          ? `https://www.tiktok.com/@${integration.profile}`
          : `https://www.tiktok.com/@${integration.profile}/video/${publicPostId}`,
        // TikTok returns the id as a number, releaseId in the db is a string
        postId: !publicPostId ? pendingData.publishId : String(publicPostId),
      };
    }

    if (status === 'FAILED') {
      // postmonster: TT-20 - fail_reason maps to a human message + action
      const mapped =
        mapTikTokErrorCode(fail_reason) ||
        mapTikTokErrorBody(JSON.stringify(post));
      throw new BadBody(
        'tiktok-error-upload',
        JSON.stringify(post),
        Buffer.from(JSON.stringify(post)),
        mapped?.message || 'TikTok failed to publish this post.'
      );
    }

    // PROCESSING_UPLOAD / PROCESSING_DOWNLOAD: keep polling
    return { status: 'pending', pendingData: nextPending };
  }

  // postmonster: Direct Post only - the inbox/upload mode (video.upload) is
  // outside the reviewed scopes and was removed (PRD 8.1).
  private postingMethod(isPhoto: boolean): string {
    return isPhoto ? '/content/init/' : '/video/init/';
  }

  // postmonster: Direct Post post_info (PRD TT-04..TT-07). privacy_level is
  // required and never defaulted (TT-05); Allow-flags invert into disable_*;
  // is_aigc / auto_add_music are intentionally not sent.
  private buildTikokPostInfoBody(firstPost: PostDetails<TikTokDto>) {
    const isPhoto = !isTikTokVideoPath(firstPost?.media?.[0]?.path);
    const settings = firstPost.settings || ({} as TikTokDto);

    return {
      post_info: {
        ...(isPhoto
          ? {
              ...(settings.title
                ? { title: settings.title.slice(0, 90) }
                : {}),
              ...(firstPost.message
                ? { description: firstPost.message }
                : {}),
            }
          : firstPost.message
            ? { title: firstPost.message }
            : {}),
        privacy_level: settings.privacy_level,
        disable_comment: !this.assetBoolean(settings.comment),
        ...(isPhoto
          ? {}
          : {
              disable_duet: !this.assetBoolean(settings.duet),
              disable_stitch: !this.assetBoolean(settings.stitch),
              ...(firstPost?.media?.[0]?.thumbnailTimestamp
                ? {
                    video_cover_timestamp_ms:
                      firstPost.media[0].thumbnailTimestamp,
                  }
                : {}),
            }),
        brand_content_toggle: this.assetBoolean(settings.brand_content_toggle),
        brand_organic_toggle: this.assetBoolean(settings.brand_organic_toggle),
      },
    };
  }

  // postmonster (PRD TT-19): PULL_FROM_URL for both video and photos. The
  // media lives on our own storage, and the TikTok guidelines say: "If video
  // resources are already on API Clients' servers, do not use FILE_UPLOAD; use
  // PULL_FROM_URL instead". The URL prefix must be verified in the TikTok
  // developer portal (Manage URL properties), the URL must be https, must not
  // redirect and must stay available for at least an hour.
  private buildTikokSourceInfoBody(firstPost: PostDetails<TikTokDto>) {
    const isPhoto = !isTikTokVideoPath(firstPost?.media?.[0]?.path);

    if (isPhoto) {
      return {
        post_mode: 'DIRECT_POST',
        media_type: 'PHOTO',
        source_info: {
          source: 'PULL_FROM_URL',
          photo_cover_index: 0,
          photo_images: firstPost.media?.map((p) => p.path),
        },
      };
    }

    return {
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: firstPost?.media?.[0]?.path!,
      },
    };
  }

  async postPending(
    id: string,
    accessToken: string,
    postDetails: PostDetails<TikTokDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;
    const isPhoto = !isTikTokVideoPath(firstPost?.media?.[0]?.path);

    // postmonster: TT-16 - fetch the latest creator info and revalidate the
    // post against it right before publishing. Nothing is silently changed:
    // any mismatch fails the post with a clear reason.
    const creator = await this.queryCreatorInfo(accessToken);
    const validation = validateTikTokSettings({
      settings: (firstPost.settings || {}) as TikTokPostSettings,
      creator,
      isPhoto,
      audited: this.isAudited(),
      videoDurationSec: firstPost?.settings?.videoDurationSec,
      messageLength: firstPost.message ? firstPost.message.length : 0,
    });
    if (validation.ok === false) {
      throw new BadBody(
        'tiktok-invalid-settings',
        JSON.stringify(firstPost.settings || {}),
        Buffer.from(JSON.stringify(validation.errors)),
        validation.errors[0]
      );
    }

    const {
      data: { publish_id },
    } = await (
      await this.fetch(
        `https://open.tiktokapis.com/v2/post/publish${this.postingMethod(
          isPhoto
        )}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            ...this.buildTikokPostInfoBody(firstPost),
            ...this.buildTikokSourceInfoBody(firstPost),
          }),
        }
      )
    ).json();

    // The publish is now irreversible on TikTok's side: return `pending` so the
    // workflow polls checkPostStatus instead of blocking (and possibly timing
    // out and re-posting) inside this activity.
    return [
      {
        id: firstPost.id,
        releaseURL: '',
        postId: '',
        status: 'pending',
        pendingData: { publishId: publish_id },
      },
    ];
  }

  // Old blocking behavior, kept for workflow versions before v1.0.6 that still
  // run (scheduled posts sleep inside them until publish time) and don't know
  // how to resolve a `pending` response - they keep polling inside the
  // activity exactly like before.
  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<TikTokDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [response] = await this.postPending(
      id,
      accessToken,
      postDetails,
      integration
    );

    const started = Date.now();

    for (const _ of Array(27).keys()) {
      // ~9 minutes at 20s interval
      const check = await this.checkPostStatus(
        accessToken,
        response.pendingData,
        integration
      );

      if (check.status === 'completed') {
        return [
          {
            id: response.id,
            releaseURL: check.releaseURL,
            postId: String(check.postId),
            status: 'success',
          },
        ];
      }

      // Cap below the 10-minute activity timeout of the old workflows using
      // this method: failing here (non-retryable) is safe, timing the activity
      // out is not - a retried activity would publish the post again.
      if (Date.now() - started > 8 * 60 * 1000) {
        break;
      }

      await timer(20000);
    }

    throw new BadBody(
      'titok-error-upload',
      JSON.stringify({}),
      Buffer.from(JSON.stringify({})),
      'TikTok refused to publish your post'
    );
  }

  async analytics(
    id: string,
    accessToken: string,
    date: number
  ): Promise<AnalyticsData[]> {
    const today = dayjs().format('YYYY-MM-DD');

    try {
      // Get user stats (follower_count, following_count, likes_count, video_count)
      const userStatsResponse = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,likes_count,video_count',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const userStatsData = await userStatsResponse.json();
      const userStats = userStatsData?.data?.user;

      const result: AnalyticsData[] = [];

      if (userStats) {
        if (userStats.follower_count !== undefined) {
          result.push({
            label: 'Followers',
            percentageChange: 0,
            data: [{ total: String(userStats.follower_count), date: today }],
          });
        }

        if (userStats.following_count !== undefined) {
          result.push({
            label: 'Following',
            percentageChange: 0,
            data: [{ total: String(userStats.following_count), date: today }],
          });
        }

        if (userStats.likes_count !== undefined) {
          result.push({
            label: 'Total Likes',
            percentageChange: 0,
            data: [{ total: String(userStats.likes_count), date: today }],
          });
        }

        if (userStats.video_count !== undefined) {
          result.push({
            label: 'Videos',
            percentageChange: 0,
            data: [{ total: String(userStats.video_count), date: today }],
          });
        }
      }

      // Get recent videos and aggregate their stats
      const videoListResponse = await fetch(
        'https://open.tiktokapis.com/v2/video/list/?fields=id',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ max_count: 20 }),
        }
      );

      const videoListData = await videoListResponse.json();
      const videos = videoListData?.data?.videos;

      if (videos && videos.length > 0) {
        const videoIds = videos.map((v: { id: string }) => v.id);

        // Query video details to get engagement metrics
        const videoQueryResponse = await fetch(
          'https://open.tiktokapis.com/v2/video/query/?fields=id,like_count,comment_count,share_count,view_count',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              filters: { video_ids: videoIds },
            }),
          }
        );

        const videoQueryData = await videoQueryResponse.json();
        const videoDetails = videoQueryData?.data?.videos;

        if (videoDetails && videoDetails.length > 0) {
          let totalViews = 0;
          let totalLikes = 0;
          let totalComments = 0;
          let totalShares = 0;

          for (const video of videoDetails) {
            totalViews += video.view_count || 0;
            totalLikes += video.like_count || 0;
            totalComments += video.comment_count || 0;
            totalShares += video.share_count || 0;
          }

          result.push({
            label: 'Views',
            percentageChange: 0,
            data: [{ total: String(totalViews), date: today }],
          });

          result.push({
            label: 'Recent Likes',
            percentageChange: 0,
            data: [{ total: String(totalLikes), date: today }],
          });

          result.push({
            label: 'Recent Comments',
            percentageChange: 0,
            data: [{ total: String(totalComments), date: today }],
          });

          result.push({
            label: 'Recent Shares',
            percentageChange: 0,
            data: [{ total: String(totalShares), date: today }],
          });
        }
      }

      return result;
    } catch (err) {
      console.error('Error fetching TikTok analytics:', err);
      return [];
    }
  }

  async missing(
    id: string,
    accessToken: string
  ): Promise<{ id: string; url: string }[]> {
    try {
      const videoListResponse = await this.fetch(
        'https://open.tiktokapis.com/v2/video/list/?fields=id,cover_image_url,title',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ max_count: 20 }),
        }
      );

      const videoListData = await videoListResponse.json();
      const videos = videoListData?.data?.videos;

      if (!videos || videos.length === 0) {
        return [];
      }

      return videos.map((v: { id: string; cover_image_url: string }) => ({
        id: String(v.id),
        url: v.cover_image_url,
      }));
    } catch (err) {
      console.error('Error fetching TikTok missing content:', err);
      return [];
    }
  }

  async postAnalytics(
    integrationId: string,
    accessToken: string,
    postId: string,
    fromDate: number
  ): Promise<AnalyticsData[]> {
    const today = dayjs().format('YYYY-MM-DD');

    if (postId.indexOf('v_pub_url') > -1) {
      const post = await (
        await fetch(
          'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=UTF-8',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              publish_id: postId,
            }),
          }
        )
      ).json();

      if (!post?.data?.publicaly_available_post_id?.[0]) {
        return [];
      }

      postId = post.data.publicaly_available_post_id[0];
    }

    try {
      // Query video details using the video ID
      const response = await fetch(
        'https://open.tiktokapis.com/v2/video/query/?fields=id,like_count,comment_count,share_count,view_count',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            filters: {
              video_ids: [postId],
            },
          }),
        }
      );

      const data = await response.json();
      const video = data?.data?.videos?.[0];

      if (!video) {
        return [];
      }

      const result: AnalyticsData[] = [];

      if (video.view_count !== undefined) {
        result.push({
          label: 'Views',
          percentageChange: 0,
          data: [{ total: String(video.view_count), date: today }],
        });
      }

      if (video.like_count !== undefined) {
        result.push({
          label: 'Likes',
          percentageChange: 0,
          data: [{ total: String(video.like_count), date: today }],
        });
      }

      if (video.comment_count !== undefined) {
        result.push({
          label: 'Comments',
          percentageChange: 0,
          data: [{ total: String(video.comment_count), date: today }],
        });
      }

      if (video.share_count !== undefined) {
        result.push({
          label: 'Shares',
          percentageChange: 0,
          data: [{ total: String(video.share_count), date: today }],
        });
      }

      return result;
    } catch (err) {
      console.error('Error fetching TikTok post analytics:', err);
      return [];
    }
  }
}
