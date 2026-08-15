import {
  AnalyticsData,
  AuthTokenDetails,
  PendingCheckResponse,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import dayjs from 'dayjs';
import {
  BadBody,
  Disconnect,
  RefreshToken,
  SocialAbstract,
  ValidityMedia,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { TikTokDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tiktok.dto';
import { timer } from '@gitroom/helpers/utils/timer';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { Integration } from '@prisma/client';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';

@Rules(
  [
    'TikTok Business can have one video or one picture or multiple pictures (up to 35), it cannot be without an attachment.',
    'content_posting_method=DIRECT_POST publishes the post to the account. content_posting_method=UPLOAD does NOT publish: it only saves the media as a draft in the user inbox of the TikTok app, where the user must manually complete and publish it. Use DIRECT_POST unless the user explicitly asks to review or edit the post inside the TikTok app first.',
    'With content_posting_method=UPLOAD, TikTok ignores every setting except the title / post content. Never tell the user that video_made_with_ai, privacy_level, duet, stitch, comment, autoAddMusic, brand_content_toggle or brand_organic_toggle will be applied in UPLOAD mode - they are silently discarded. If the user asks for any of those settings, tell them it requires DIRECT_POST.',
    'video_made_with_ai, duet and stitch apply to video posts only. privacy_level and autoAddMusic apply to photo posts only - the TikTok Business API has no privacy or music field for video posts, so those settings are discarded when the attachment is a video.',
    'Media is pulled by TikTok from its URL, so the media must be uploaded to Postiz and the media domain must be a verified URL property of the TikTok Business app.',
  ].join(' ')
)
export class TiktokBusinessProvider
  extends SocialAbstract
  implements SocialProvider
{
  identifier = 'tiktok-business';
  name = 'TikTok';
  isBetweenSteps = false;
  convertToJPEG = true;
  scopes = [
    'user.info.basic',
    'user.info.username',
    'user.info.stats',
    'video.list',
    'video.upload',
    'video.publish',
  ];
  override maxConcurrentJob = 10000;
  dto = TikTokDto;
  editor = 'normal' as const;
  maxLength() {
    // Business API caption limit for videos (photos allow 4,000)
    return 2200;
  }

  private baseUrl = 'https://business-api.tiktok.com/open_api/v1.3';

  // The TikTok developer portal only accepts redirect URLs that end with "/"
  // for Business apps, so the trailing slash here is not cosmetic - the
  // redirect_uri sent on the token exchange must match the registered one.
  private redirectUri() {
    return `${
      process?.env?.FRONTEND_URL?.indexOf('https') === -1
        ? 'https://redirectmeto.com/'
        : ''
    }${process?.env?.FRONTEND_URL}/integrations/social/tiktok-business/`;
  }

  override async checkValidity(
    items: Array<ValidityMedia[]>
  ): Promise<string | true> {
    const [firstItems] = items ?? [];
    if ((firstItems?.length ?? 0) === 0) {
      return 'No video / images selected';
    }
    if (
      (firstItems?.length ?? 0) > 1 &&
      firstItems?.some((p) => (p?.path?.indexOf?.('mp4') ?? -1) > -1)
    ) {
      return 'Only pictures are supported when selecting multiple items';
    } else if (
      firstItems?.length !== 1 &&
      (firstItems?.[0]?.path?.indexOf?.('mp4') ?? -1) > -1
    ) {
      return 'You need one media';
    }
    if ((firstItems?.length ?? 0) > 35) {
      return 'You can select up to 35 pictures';
    }
    return true;
  }

  override handleErrors(body: string):
    | {
        type: 'refresh-token' | 'bad-body' | 'disconnect';
        value: string;
      }
    | undefined {
    // Authentication/Authorization errors - require re-authentication.
    // The Business API answers HTTP 200 with a non-zero `code`, so token
    // problems are detected from the body, not the status code.
    if (
      body.indexOf('access_token_invalid') > -1 ||
      body.indexOf('Access token is incorrect') > -1 ||
      body.indexOf('Access token has expired') > -1 ||
      body.indexOf('auth_removed') > -1
    ) {
      return {
        type: 'refresh-token' as const,
        value:
          'Access token invalid, please re-authenticate your TikTok account',
      };
    }

    // Rate limiting errors
    if (
      body.indexOf('rate_limit_exceeded') > -1 ||
      body.indexOf('Too many requests') > -1
    ) {
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

    if (body.indexOf('spam_risk') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'TikTok detected potential spam',
      };
    }

    // Unlike the legacy app there is no migration target configured for this
    // provider, so the cap stays a failed post (re-connecting cannot reset a
    // daily quota) - if this app is ever migrated too, switch to 'disconnect'.
    if (body.indexOf('reached_active_user_cap') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'TikTok daily user limit reached, please try again tomorrow',
      };
    }

    if (body.indexOf('url_ownership_unverified') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'The media domain is not a verified URL property of the TikTok app',
      };
    }

    if (body.indexOf('publish_cancelled') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'TikTok cancelled the upload, please try again',
      };
    }

    if (body.indexOf('picture_size_check_failed') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'Video must be at least 360p, Picture must not exceed 1080x1920',
      };
    }

    // Content/Format validation errors
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

    if (body.indexOf('TikTok API error') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'TikTok API error, please try again',
      };
    }

    // Fall back to parent class error handling
    return undefined;
  }

  // Every Business API endpoint (except OAuth) authenticates with the
  // `Access-Token` header and wraps the payload in {code, message, data} -
  // errors come back as HTTP 200 with a non-zero code.
  private async fetchUserInformation(accessToken: string, businessId: string) {
    const information = await (
      await this.fetch(
        `${this.baseUrl}/business/get/?business_id=${encodeURIComponent(
          businessId
        )}&fields=${encodeURIComponent(
          JSON.stringify(['username', 'display_name', 'profile_image'])
        )}`,
        {
          method: 'GET',
          headers: {
            'Access-Token': accessToken,
          },
        }
      )
    ).json();

    // A non-zero code arrives as HTTP 200: without this check the auth flow
    // would "succeed" with an undefined name/picture/profile and create a
    // broken channel.
    if (information?.code !== 0) {
      const asString = JSON.stringify(information);
      const handleError = this.handleErrors(asString);
      throw new BadBody(
        'tiktok-business',
        asString,
        Buffer.from('{}'),
        handleError?.value ||
          information?.message ||
          'Could not load the TikTok business account'
      );
    }

    return {
      display_name: information.data?.display_name,
      profile_image: information.data?.profile_image,
      username: information.data?.username,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const {
      data: { access_token, refresh_token, open_id },
    } = await (
      await fetch(`${this.baseUrl}/tt_user/oauth2/refresh_token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.TIKTOK_BUSINESS_CLIENT_ID!,
          client_secret: process.env.TIKTOK_BUSINESS_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      })
    ).json();

    const { display_name, profile_image, username } =
      await this.fetchUserInformation(access_token, open_id);

    return {
      refreshToken: refresh_token,
      expiresIn: dayjs().add(23, 'hours').unix() - dayjs().unix(),
      accessToken: access_token,
      // open_id is stored verbatim: it doubles as the business_id parameter of
      // every Business API call, so it must not be normalized.
      id: open_id,
      name: display_name,
      picture: profile_image || '',
      username: username,
    };
  }

  async generateAuthUrl() {
    const state = Math.random().toString(36).substring(2);

    return {
      url:
        'https://www.tiktok.com/v2/auth/authorize/' +
        `?client_key=${process.env.TIKTOK_BUSINESS_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(this.redirectUri())}` +
        `&state=${state}` +
        `&response_type=code` +
        `&disable_auto_auth=1` +
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
    const {
      data: { access_token, refresh_token, scope, open_id },
    } = await (
      await fetch(`${this.baseUrl}/tt_user/oauth2/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.TIKTOK_BUSINESS_CLIENT_ID!,
          client_secret: process.env.TIKTOK_BUSINESS_CLIENT_SECRET!,
          grant_type: 'authorization_code',
          auth_code: params.code,
          redirect_uri: this.redirectUri(),
        }),
      })
    ).json();

    this.checkScopes(this.scopes, scope);

    const { display_name, profile_image, username } =
      await this.fetchUserInformation(access_token, open_id);

    return {
      id: open_id,
      name: display_name,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: dayjs().add(23, 'hours').unix() - dayjs().unix(),
      picture: profile_image || '',
      username: username,
    };
  }

  // Single status check for a publish_id, no loops and no timers: `post` returns
  // a `pending` PostResponse right after the publish call, and the post workflow
  // polls this method with durable timers, so a stuck/retried check can never
  // re-run the publish and duplicate the post.
  override async checkPostStatus(
    accessToken: string,
    pendingData: { publishId: string },
    integration: Integration
  ): Promise<PendingCheckResponse> {
    let post: any;
    try {
      post = await (
        await this.fetch(
          `${this.baseUrl}/business/publish/status/?business_id=${encodeURIComponent(
            integration.internalId
          )}&publish_id=${encodeURIComponent(pendingData.publishId)}`,
          {
            method: 'GET',
            headers: {
              'Access-Token': accessToken,
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

      // Transient API error while checking the status: the post may already
      // be live, so keep polling instead of failing it - if the API stays
      // broken the caller exhausts its checks and warns the user properly.
      return { status: 'pending', pendingData };
    }

    // Errors arrive as HTTP 200 with a non-zero code, invisible to this.fetch:
    // a token error must surface as RefreshToken, anything else is treated as
    // transient and keeps polling (same rationale as the catch above).
    if (post?.code !== 0) {
      const asString = JSON.stringify(post);
      const handleError = this.handleErrors(asString);
      if (handleError?.type === 'refresh-token') {
        throw new RefreshToken('tiktok-business', asString, '{}', handleError.value);
      }
      if (handleError?.type === 'disconnect') {
        throw new Disconnect('tiktok-business', asString, '{}', handleError.value);
      }
      return { status: 'pending', pendingData };
    }

    const { status, post_ids, reason } = post?.data || {};

    if (status === 'SEND_TO_USER_INBOX') {
      return {
        status: 'completed',
        releaseURL: 'https://www.tiktok.com/messages?lang=en',
        postId: 'missing',
      };
    }

    if (status === 'PUBLISH_COMPLETE') {
      // post_ids can lag up to 3 minutes behind PUBLISH_COMPLETE, and never
      // shows up at all for non-public posts - fall back to the profile URL
      // and keep the share_id (postAnalytics resolves it later).
      const publicPostId = post_ids?.[0];

      return {
        status: 'completed',
        releaseURL: !publicPostId
          ? `https://www.tiktok.com/@${integration.profile}`
          : `https://www.tiktok.com/@${integration.profile}/video/${publicPostId}`,
        postId: !publicPostId ? pendingData.publishId : String(publicPostId),
      };
    }

    if (status === 'FAILED') {
      const handleError = this.handleErrors(
        `${reason || ''} ${JSON.stringify(post)}`
      );
      throw new BadBody(
        'tiktok-business-error-upload',
        JSON.stringify(post),
        Buffer.from(JSON.stringify(post)),
        handleError?.value || ''
      );
    }

    return { status: 'pending', pendingData };
  }

  // UPLOAD does not publish - it only drops the media into the user's TikTok
  // inbox as a draft - so only an explicit UPLOAD selects it. A missing value
  // (drafts, or any caller that skipped the setting) publishes instead of
  // silently landing in the inbox.
  private contentPostingMethod(
    firstPost: PostDetails<TikTokDto>
  ): TikTokDto['content_posting_method'] {
    return firstPost?.settings?.content_posting_method === 'UPLOAD'
      ? 'UPLOAD'
      : 'DIRECT_POST';
  }

  // The Business API is PULL_FROM_URL only: TikTok downloads the media from its
  // URL, there is no FILE_UPLOAD / chunked upload variant of these endpoints.
  private buildVideoBody(businessId: string, firstPost: PostDetails<TikTokDto>) {
    const isDraft = this.contentPostingMethod(firstPost) === 'UPLOAD';

    return {
      business_id: businessId,
      video_url: firstPost?.media?.[0]?.path!,
      ...(firstPost?.media?.[0]?.thumbnail
        ? { custom_thumbnail_url: firstPost?.media?.[0]?.thumbnail }
        : firstPost?.media?.[0]?.thumbnailTimestamp
        ? { thumbnail_offset: firstPost?.media?.[0]?.thumbnailTimestamp }
        : {}),
      post_info: {
        ...(firstPost.message ? { caption: firstPost.message } : {}),
        // The video endpoint has no privacy_level field - unlike photos,
        // videos publish with the account default.
        is_brand_organic: this.assetBoolean(
          firstPost.settings.brand_organic_toggle
        ),
        is_branded_content: this.assetBoolean(
          firstPost.settings.brand_content_toggle
        ),
        ...(isDraft
          ? { upload_to_draft: true }
          : {
              disable_comment: !this.assetBoolean(firstPost.settings.comment),
              disable_duet: !this.assetBoolean(firstPost.settings.duet),
              disable_stitch: !this.assetBoolean(firstPost.settings.stitch),
              is_ai_generated: this.assetBoolean(
                firstPost.settings.video_made_with_ai
              ),
            }),
      },
    };
  }

  private buildPhotoBody(businessId: string, firstPost: PostDetails<TikTokDto>) {
    const isDraft = this.contentPostingMethod(firstPost) === 'UPLOAD';

    return {
      business_id: businessId,
      photo_images: firstPost.media?.map((p) => p.path),
      photo_cover_index: 0,
      post_info: {
        ...(firstPost.settings.title
          ? { title: firstPost.settings.title.slice(0, 90) }
          : {}),
        ...(firstPost.message ? { caption: firstPost.message } : {}),
        is_brand_organic: this.assetBoolean(
          firstPost.settings.brand_organic_toggle
        ),
        is_branded_content: this.assetBoolean(
          firstPost.settings.brand_content_toggle
        ),
        ...(isDraft
          ? { is_draft: true }
          : {
              privacy_level:
                firstPost.settings.privacy_level || 'PUBLIC_TO_EVERYONE',
              disable_comment: !this.assetBoolean(firstPost.settings.comment),
              auto_add_music: firstPost.settings.autoAddMusic === 'yes',
            }),
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
    const isPhoto = !hasExtension(firstPost?.media?.[0]?.path, 'mp4');

    const body = isPhoto
      ? this.buildPhotoBody(id, firstPost)
      : this.buildVideoBody(id, firstPost);

    const publish = await (
      await this.fetch(
        `${this.baseUrl}${
          isPhoto ? '/business/photo/publish/' : '/business/video/publish/'
        }`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Access-Token': accessToken,
          },
          body: JSON.stringify(body),
        }
      )
    ).json();

    // The Business API reports failures as HTTP 200 with a non-zero code, so
    // this.fetch cannot catch them - classify the body here.
    if (publish?.code !== 0 || !publish?.data?.share_id) {
      const asString = JSON.stringify(publish);
      const handleError = this.handleErrors(asString);
      if (handleError?.type === 'refresh-token') {
        throw new RefreshToken(
          'tiktok-business',
          asString,
          JSON.stringify(body),
          handleError.value
        );
      }
      if (handleError?.type === 'disconnect') {
        throw new Disconnect(
          'tiktok-business',
          asString,
          JSON.stringify(body),
          handleError.value
        );
      }
      throw new BadBody(
        'tiktok-business-error-upload',
        asString,
        Buffer.from(JSON.stringify(body)),
        handleError?.value || publish?.message || 'TikTok refused the post'
      );
    }

    // The publish is now irreversible on TikTok's side: return `pending` so the
    // workflow polls checkPostStatus instead of blocking (and possibly timing
    // out and re-posting) inside this activity.
    return [
      {
        id: firstPost.id,
        releaseURL: '',
        postId: '',
        status: 'pending',
        pendingData: { publishId: publish.data.share_id },
      },
    ];
  }

  // Old blocking behavior, kept for workflow versions before v1.0.6 that still
  // run and don't know how to resolve a `pending` response - they keep polling
  // inside the activity exactly like before.
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
      'tiktok-business-error-upload',
      JSON.stringify({}),
      Buffer.from(JSON.stringify({})),
      'TikTok refused to publish your post'
    );
  }

  private async loadVideoList(
    accessToken: string,
    businessId: string,
    fields: string[]
  ) {
    const videoListData = await (
      await this.fetch(
        `${this.baseUrl}/business/video/list/?business_id=${encodeURIComponent(
          businessId
        )}&fields=${encodeURIComponent(
          JSON.stringify(fields)
        )}&max_count=20`,
        {
          method: 'GET',
          headers: {
            'Access-Token': accessToken,
          },
        }
      )
    ).json();

    return videoListData?.data?.videos;
  }

  async analytics(
    id: string,
    accessToken: string,
    date: number
  ): Promise<AnalyticsData[]> {
    const today = dayjs().format('YYYY-MM-DD');

    try {
      // Real-time account stats (followers, following, likes, videos)
      const userStatsData = await (
        await fetch(
          `${this.baseUrl}/business/get/?business_id=${encodeURIComponent(
            id
          )}&fields=${encodeURIComponent(
            JSON.stringify([
              'followers_count',
              'following_count',
              'total_likes',
              'videos_count',
            ])
          )}`,
          {
            method: 'GET',
            headers: {
              'Access-Token': accessToken,
            },
          }
        )
      ).json();

      const userStats = userStatsData?.data;

      const result: AnalyticsData[] = [];

      if (userStats) {
        if (userStats.followers_count !== undefined) {
          result.push({
            label: 'Followers',
            percentageChange: 0,
            data: [{ total: String(userStats.followers_count), date: today }],
          });
        }

        if (userStats.following_count !== undefined) {
          result.push({
            label: 'Following',
            percentageChange: 0,
            data: [{ total: String(userStats.following_count), date: today }],
          });
        }

        if (userStats.total_likes !== undefined) {
          result.push({
            label: 'Total Likes',
            percentageChange: 0,
            data: [{ total: String(userStats.total_likes), date: today }],
          });
        }

        if (userStats.videos_count !== undefined) {
          result.push({
            label: 'Videos',
            percentageChange: 0,
            data: [{ total: String(userStats.videos_count), date: today }],
          });
        }
      }

      // Recent posts with their lifetime engagement, aggregated
      const videos = await this.loadVideoList(accessToken, id, [
        'item_id',
        'likes',
        'comments',
        'shares',
        'video_views',
      ]);

      if (videos && videos.length > 0) {
        let totalViews = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;

        for (const video of videos) {
          totalViews += video.video_views || 0;
          totalLikes += video.likes || 0;
          totalComments += video.comments || 0;
          totalShares += video.shares || 0;
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

      return result;
    } catch (err) {
      console.error('Error fetching TikTok Business analytics:', err);
      return [];
    }
  }

  async missing(
    id: string,
    accessToken: string
  ): Promise<{ id: string; url: string }[]> {
    try {
      const videos = await this.loadVideoList(accessToken, id, [
        'item_id',
        'thumbnail_url',
      ]);

      if (!videos || videos.length === 0) {
        return [];
      }

      return videos.map((v: { item_id: string; thumbnail_url: string }) => ({
        id: String(v.item_id),
        url: v.thumbnail_url,
      }));
    } catch (err) {
      console.error('Error fetching TikTok Business missing content:', err);
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

    // Posts saved before post_ids became available keep their share_id
    // (v_pub_url~... / p_pub_url~...) as releaseId - resolve it to the public
    // post id first.
    if (postId.indexOf('_pub_url') > -1) {
      const post = await (
        await fetch(
          `${this.baseUrl}/business/publish/status/?business_id=${encodeURIComponent(
            integrationId
          )}&publish_id=${encodeURIComponent(postId)}`,
          {
            method: 'GET',
            headers: {
              'Access-Token': accessToken,
            },
          }
        )
      ).json();

      if (!post?.data?.post_ids?.[0]) {
        return [];
      }

      postId = String(post.data.post_ids[0]);
    }

    try {
      const videoQueryData = await (
        await fetch(
          `${this.baseUrl}/business/video/list/?business_id=${encodeURIComponent(
            integrationId
          )}&fields=${encodeURIComponent(
            JSON.stringify(['item_id', 'likes', 'comments', 'shares', 'video_views'])
          )}&filters=${encodeURIComponent(
            JSON.stringify({ video_ids: [postId] })
          )}`,
          {
            method: 'GET',
            headers: {
              'Access-Token': accessToken,
            },
          }
        )
      ).json();

      const video = videoQueryData?.data?.videos?.[0];

      if (!video) {
        return [];
      }

      const result: AnalyticsData[] = [];

      if (video.video_views !== undefined) {
        result.push({
          label: 'Views',
          percentageChange: 0,
          data: [{ total: String(video.video_views), date: today }],
        });
      }

      if (video.likes !== undefined) {
        result.push({
          label: 'Likes',
          percentageChange: 0,
          data: [{ total: String(video.likes), date: today }],
        });
      }

      if (video.comments !== undefined) {
        result.push({
          label: 'Comments',
          percentageChange: 0,
          data: [{ total: String(video.comments), date: today }],
        });
      }

      if (video.shares !== undefined) {
        result.push({
          label: 'Shares',
          percentageChange: 0,
          data: [{ total: String(video.shares), date: today }],
        });
      }

      return result;
    } catch (err) {
      console.error('Error fetching TikTok Business post analytics:', err);
      return [];
    }
  }
}
