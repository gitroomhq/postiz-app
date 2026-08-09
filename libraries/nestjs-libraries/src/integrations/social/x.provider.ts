import { TweetV2, TwitterApi } from 'twitter-api-v2';
import { createHmac, randomBytes } from 'crypto';
import { parseFragment } from 'parse5';
import {
  AnalyticsData,
  AuthTokenDetails,
  PendingCheckResponse,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { lookup } from 'mime-types';
import sharp from 'sharp';
import { readOrFetch } from '@gitroom/helpers/utils/read.or.fetch';
import {
  BadBody,
  RefreshToken,
  SocialAbstract,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Plug } from '@gitroom/helpers/decorators/plug.decorator';
import { Integration } from '@prisma/client';
import { timer } from '@gitroom/helpers/utils/timer';
import { PostPlug } from '@gitroom/helpers/decorators/post.plug';
import dayjs from 'dayjs';
import { uniqBy } from 'lodash';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { stripLinks as removeLinks } from '@gitroom/helpers/utils/strip.links';
import { XDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/x.dto';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';

// Travels through the workflow history between postPending, checkPostStatus
// and finalizePost - keep it small JSON (media ids and the tweet content).
type XPendingData = {
  message: string;
  settings: {
    who_can_reply_post?:
      | 'everyone'
      | 'following'
      | 'mentionedUsers'
      | 'subscribers'
      | 'verified';
    community?: string;
    made_with_ai?: boolean;
    paid_partnership?: boolean;
    post_type?: 'post' | 'article';
    article_title?: string;
    article_status?: 'draft' | 'published';
  };
  mediaIds: string[];
  // Article cover selected in the settings, uploaded separately from the post
  // media (which is embedded in the article body).
  coverMediaId?: string;
  // Media still transcoding on X's side, waiting for STATUS = succeeded.
  processingIds: string[];
  // Arm -> confirm -> publish handshake (same as the Facebook story flow):
  // finalizePost arms without mutating, checkPostStatus witnesses, and only a
  // witnessed attempt runs the create - so a create that dies with an unknown
  // outcome is detected instead of run again (X has no idempotency key).
  attempting?: boolean;
  confirmed?: boolean;
};

@Rules(
  `X can have maximum 4 pictures, or maximum one video, it can also be without attachments, it can also be published as a long-form article (draft or published) when post_type is set to article ${
    process.env.STRIP_LINKS_FROM_X_POSTS
      ? 'do not add links, they will be stripped from the post'
      : ''
  }`
)
export class XProvider extends SocialAbstract implements SocialProvider {
  identifier = 'x';
  name = 'X';
  isBetweenSteps = false;
  scopes = [] as string[];
  stripLinks = () => !!process.env.STRIP_LINKS_FROM_X_POSTS;
  // X rate limits are per user (300 posts / 3 hours), not per app, so the cap
  // only needs to keep bursts polite. With the pending flow the slot is held
  // for actual API work only (processing waits live in workflow timers), so a
  // single slot is no longer required - it would serialize every customer's
  // status checks behind uploads.
  override maxConcurrentJob = 10;
  toolTip =
    'You will be logged in into your current account, if you would like a different account, change it first on X';

  // The provider receives the rich HTML so articles keep their formatting;
  // regular tweets are stripped to plain text inside the provider.
  editor = 'html' as const;
  dto = XDto;

  maxLength(additionalSettings?: any, settings?: any) {
    // Articles are long-form content, the tweet character limit doesn't apply.
    if (settings?.post_type === 'article') {
      return 100000;
    }

    // Accepts either the parsed additionalSettings array (from validation) or a
    // plain boolean (legacy callers). "Verified" => premium => higher limit.
    const isTwitterPremium = Array.isArray(additionalSettings)
      ? !!additionalSettings.find((p: any) => p?.title === 'Verified')?.value
      : !!additionalSettings;
    return isTwitterPremium ? 4000 : 280;
  }

  // With `editor = 'html'` the activity hands the provider HTML (needed for
  // articles); everything that becomes a tweet has to be flattened back to the
  // plain text X expects - same output the old 'normal' editor produced.
  private toTweetText(message: string) {
    return stripHtmlValidation(
      'normal',
      message,
      true,
      false,
      !/<\/?[a-z][\s\S]*>/i.test(message)
    );
  }

  override async checkValidity(
    [firstPost, ...comments]: Array<{ path: string }[]>,
    settings: any
  ): Promise<string | true> {
    if (settings?.post_type !== 'article') {
      return true;
    }

    if (
      [...(firstPost || []), ...comments.flat()].some((m) =>
        hasExtension(m.path, 'mp4')
      )
    ) {
      return 'X articles only support images';
    }

    // Replies can only be attached to the seed post a published article
    // creates - a draft has no post to reply to.
    if (settings?.article_status !== 'published' && comments.length) {
      return 'A draft article cannot have thread replies, remove them or publish the article';
    }

    return true;
  }

  override handleErrors(body: string):
    | {
        type: 'refresh-token' | 'bad-body' | 'retry';
        value: string;
      }
    | undefined {
    if (body.includes('You are not permitted to perform this action')) {
      return {
        type: 'bad-body',
        value:
          'There is a problem posting, please edit your post and check character count and media attachments',
      };
    }
    if (body.includes('Service Unavailable')) {
      return {
        type: 'retry',
        value: 'X is currently unavailable, please try again later',
      };
    }
    if (body.includes('maximum of one cashtag')) {
      return {
        type: 'bad-body',
        value: 'There can be maximum of one cashtag ($SYMBOL) per post',
      };
    }
    if (body.includes('maximum of 4 items')) {
      return {
        type: 'bad-body',
        value: 'There must be a maximum of 4 items per post',
      };
    }
    if (body.includes('Unsupported Authentication')) {
      return {
        type: 'refresh-token',
        value: 'X authentication has expired, please reconnect your account',
      };
    }

    if (body.includes('You are not allowed to create a Tweet')) {
      return {
        type: 'bad-body',
        value: 'You are not allowed to create a post with duplicate content',
      }
    }

    if (body.includes('usage-capped')) {
      return {
        type: 'bad-body',
        value: 'Posting failed - capped reached. Please try again later',
      };
    }

    if (body.includes('user-suspended')) {
      return {
        type: 'bad-body',
        value:
          'Your X account has been suspended, please reconnect with another account',
      };
    }
    if (body.includes('duplicate-rules')) {
      return {
        type: 'bad-body',
        value:
          'You have already posted this post, please wait before posting again',
      };
    }
    if (body.includes('Your account is not permitted to access this feature')) {
      return {
        type: 'bad-body',
        value:
          'X blocked your request',
      };
    }
    if (body.includes('The Tweet contains an invalid URL.')) {
      return {
        type: 'bad-body',
        value: 'The Tweet contains a URL that is not allowed on X',
      };
    }
    if (
      body.includes(
        'This user is not allowed to post a video longer than 2 minutes'
      )
    ) {
      return {
        type: 'bad-body',
        value:
          'The video you are trying to post is longer than 2 minutes, which is not allowed for this account',
      };
    }
    return undefined;
  }

  @Plug({
    identifier: 'x-autoRepostPost',
    title: 'Auto Repost Posts',
    disabled: !!process.env.DISABLE_X_ANALYTICS,
    description:
      'When a post reached a certain number of likes, repost it to increase engagement (1 week old posts)',
    runEveryMilliseconds: 21600000,
    totalRuns: 3,
    fields: [
      {
        name: 'likesAmount',
        type: 'number',
        placeholder: 'Amount of likes',
        description: 'The amount of likes to trigger the repost',
        validation: /^\d+$/,
      },
    ],
  })
  async autoRepostPost(
    integration: Integration,
    id: string,
    fields: { likesAmount: string }
  ) {
    // @ts-ignore
    // eslint-disable-next-line prefer-rest-params
    const [accessTokenSplit, accessSecretSplit] = integration.token.split(':');
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: accessTokenSplit,
      accessSecret: accessSecretSplit,
    });

    if (
      (await client.v2.tweetLikedBy(id)).meta.result_count >=
      +fields.likesAmount
    ) {
      await timer(2000);
      await client.v2.retweet(integration.internalId, id);
      return true;
    }

    return false;
  }

  @PostPlug({
    identifier: 'x-repost-post-users',
    title: 'Add Re-posters',
    description: 'Add accounts to repost your post',
    pickIntegration: ['x'],
    fields: [],
  })
  async repostPostUsers(
    integration: Integration,
    originalIntegration: Integration,
    postId: string,
    information: any
  ) {
    const [accessTokenSplit, accessSecretSplit] = integration.token.split(':');
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: accessTokenSplit,
      accessSecret: accessSecretSplit,
    });

    const {
      data: { id },
    } = await client.v2.me();

    try {
      await client.v2.retweet(id, postId);
    } catch (err) {
      /** nothing **/
    }
  }

  @Plug({
    identifier: 'x-autoPlugPost',
    title: 'Auto plug post',
    disabled: !!process.env.DISABLE_X_ANALYTICS,
    description:
      'When a post reached a certain number of likes, add another post to it so you followers get a notification about your promotion',
    runEveryMilliseconds: 21600000,
    totalRuns: 3,
    fields: [
      {
        name: 'likesAmount',
        type: 'number',
        placeholder: 'Amount of likes',
        description: 'The amount of likes to trigger the repost',
        validation: /^\d+$/,
      },
      {
        name: 'post',
        type: 'richtext',
        placeholder: 'Post to plug',
        description: 'Message content to plug',
        validation: /^[\s\S]{3,}$/g,
      },
    ],
  })
  async autoPlugPost(
    integration: Integration,
    id: string,
    fields: { likesAmount: string; post: string }
  ) {
    // @ts-ignore
    // eslint-disable-next-line prefer-rest-params
    const [accessTokenSplit, accessSecretSplit] = integration.token.split(':');
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: accessTokenSplit,
      accessSecret: accessSecretSplit,
    });

    if (
      (await client.v2.tweetLikedBy(id)).meta.result_count >=
      +fields.likesAmount
    ) {
      await timer(2000);

      const plugText = stripHtmlValidation('normal', fields.post, true);
      await client.v2.tweet({
        text: this.stripLinks() ? removeLinks(plugText) : plugText,
        reply: { in_reply_to_tweet_id: id },
      });
      return true;
    }

    return false;
  }

  async refreshToken(): Promise<AuthTokenDetails> {
    return {
      id: '',
      name: '',
      accessToken: '',
      refreshToken: '',
      expiresIn: 0,
      picture: '',
      username: '',
    };
  }

  async generateAuthUrl() {
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
    });
    const { url, oauth_token, oauth_token_secret } =
      await client.generateAuthLink(
        (process.env.X_URL || process.env.FRONTEND_URL) +
          `/integrations/social/x`,
        {
          authAccessType: 'write',
          linkMode: 'authenticate',
          forceLogin: false,
        }
      );
    return {
      url,
      codeVerifier: oauth_token + ':' + oauth_token_secret,
      state: oauth_token,
    };
  }

  async authenticate(params: { code: string; codeVerifier: string }) {
    const { code, codeVerifier } = params;
    const [oauth_token, oauth_token_secret] = codeVerifier.split(':');

    const startingClient = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: oauth_token,
      accessSecret: oauth_token_secret,
    });

    const { accessToken, client, accessSecret } = await startingClient.login(
      code
    );

    const {
      data: { username, verified, profile_image_url, name, id },
    } = await client.v2.me({
      'user.fields': [
        'username',
        'verified',
        'verified_type',
        'profile_image_url',
        'name',
      ],
    });

    return {
      id: String(id),
      accessToken: accessToken + ':' + accessSecret,
      name,
      refreshToken: '',
      expiresIn: 999999999,
      picture: profile_image_url || '',
      username,
      additionalSettings: [
        {
          title: 'Verified',
          description: 'Is this a verified user? (Premium)',
          type: 'checkbox' as const,
          value: verified,
        },
      ],
    };
  }

  private async getClient(accessToken: string) {
    const [accessTokenSplit, accessSecretSplit] = accessToken.split(':');
    return new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: accessTokenSplit,
      accessSecret: accessSecretSplit,
    });
  }

  private signOAuth1(
    method: string,
    url: string,
    accessToken: string,
    accessSecret: string
  ): string {
    const pct = (s: string) =>
      encodeURIComponent(s)
        .replace(/!/g, '%21')
        .replace(/\*/g, '%2A')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29');

    const params: Record<string, string> = {
      oauth_consumer_key: process.env.X_API_KEY!,
      oauth_nonce: randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: String(Math.floor(Date.now() / 1000)),
      oauth_token: accessToken,
      oauth_version: '1.0',
    };

    const paramString = Object.keys(params)
      .sort()
      .map((k) => `${pct(k)}=${pct(params[k])}`)
      .join('&');

    const baseString = [
      method.toUpperCase(),
      pct(url.split('?')[0]),
      pct(paramString),
    ].join('&');

    const signingKey = `${pct(process.env.X_API_SECRET!)}&${pct(accessSecret)}`;
    params.oauth_signature = createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');

    return (
      'OAuth ' +
      Object.keys(params)
        .sort()
        .map((k) => `${pct(k)}="${pct(params[k])}"`)
        .join(', ')
    );
  }

  // X's v2 chunked upload requires a Buffer per APPEND segment, so we read one
  // ranged chunk at a time (mediaChunk) instead of buffering the whole video.
  // 1MB is the exact chunk size client.v2.uploadMedia used in production, so
  // it is proven against X's APPEND limits; larger chunks are documented but
  // unproven here.
  private static readonly X_UPLOAD_CHUNK_SIZE = 1024 * 1024;

  private async uploadVideoInChunks(client: TwitterApi, path: string) {
    const totalBytes = await this.mediaSize(path, this.identifier);
    const mediaType = String(lookup(path) || 'video/mp4');

    const init = await client.v2.post<{ data: { id: string } }>(
      'media/upload/initialize',
      {
        media_type: mediaType,
        total_bytes: totalBytes,
        media_category: 'tweet_video',
      }
    );
    const mediaId = init.data.id;

    const chunkSize = XProvider.X_UPLOAD_CHUNK_SIZE;
    const totalChunkCount = Math.ceil(totalBytes / chunkSize);
    for (let i = 0; i < totalChunkCount; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, totalBytes) - 1;
      await client.v2.post(
        `media/upload/${mediaId}/append`,
        {
          segment_index: i,
          media: await this.mediaChunk(path, start, end, this.identifier),
        },
        { forceBodyMode: 'form-data' }
      );
    }

    const finalize = await client.v2.post<{
      data: {
        id: string;
        processing_info?: { state: string; check_after_secs?: number };
      };
    }>(`media/upload/${mediaId}/finalize`);

    const processing = finalize.data.processing_info;

    // An explicit rejection right at finalize: the video will never process.
    if (processing?.state === 'failed') {
      throw new BadBody(
        this.identifier,
        JSON.stringify(processing),
        Buffer.from('{}'),
        `X failed to process the uploaded video${
          (processing as any)?.error?.message
            ? `: ${(processing as any).error.message}`
            : ''
        }`
      );
    }

    // Per the docs a missing processing_info means the media is ready to use;
    // anything else keeps transcoding asynchronously and must reach
    // `succeeded` before the media_id can be attached to a post.
    return {
      mediaId,
      processing: !!processing && processing.state !== 'succeeded',
    };
  }

  // Single STATUS read for a media_id, no loops and no timers - the polling
  // loop lives in the post workflow (checkPostStatus) or, for the legacy
  // paths, in waitForMediaProcessing.
  private async mediaProcessingStatus(client: TwitterApi, mediaId: string) {
    const status = await client.v2.get<{
      data: {
        processing_info?: {
          state: string;
          check_after_secs?: number;
          error?: { message?: string };
        };
      };
    }>('media/upload', { command: 'STATUS', media_id: mediaId });

    return status.data.processing_info;
  }

  // Blocking processing wait, used by the paths that still resolve everything
  // inside one activity (comments, and post() for pre-v1.0.6 workflows).
  private async waitForMediaProcessing(client: TwitterApi, mediaId: string) {
    // X drives the pace via check_after_secs; cap on accumulated wait time
    // (long videos can legitimately process for many minutes) instead of an
    // attempt count, but never poll forever.
    let waitedMs = 0;
    const maxWaitMs = 7 * 60 * 1000;
    let processing = await this.mediaProcessingStatus(client, mediaId);

    while (processing && processing.state !== 'succeeded') {
      if (processing.state === 'failed' || waitedMs >= maxWaitMs) {
        throw new BadBody(
          this.identifier,
          JSON.stringify(processing),
          Buffer.from('{}'),
          `X failed to process the uploaded video${
            processing?.error?.message ? `: ${processing.error.message}` : ''
          }`
        );
      }

      const waitMs = (processing.check_after_secs || 1) * 1000;
      await timer(waitMs);
      waitedMs += waitMs;
      processing = await this.mediaProcessingStatus(client, mediaId);
    }
  }

  // With ten X activities running concurrently (maxConcurrentJob), a user
  // publishing several posts at the same minute can 429 on the upload
  // endpoints; twitter-api-v2 errors never pass through this.fetch's backoff,
  // so retry them here instead of hard-failing the post. Nothing is published
  // at upload time, so a retried upload can never duplicate a post.
  private async uploadWithRateLimitRetry<T>(
    func: () => Promise<T>,
    totalRetries = 0
  ): Promise<T> {
    try {
      return await func();
    } catch (err: any) {
      if (totalRetries <= 2 && (err?.code === 429 || err?.rateLimitError)) {
        await timer(5000 * (totalRetries + 1));
        return this.uploadWithRateLimitRetry(func, totalRetries + 1);
      }

      throw err;
    }
  }

  private async uploadMediaEntries(
    client: TwitterApi,
    postDetails: PostDetails<any>[],
    asArticleImage = false
  ) {
    // Media is uploaded sequentially on purpose: uploading everything with
    // Promise.all holds every file in memory at the same time.
    const media = {} as Record<string, string[]>;
    const processingIds: string[] = [];
    for (const p of postDetails) {
      for (const m of p?.media || []) {
        const uploaded = await this.runInConcurrent(
          async () =>
            hasExtension(m.path, 'mp4')
              ? this.uploadWithRateLimitRetry(() =>
                  this.uploadVideoInChunks(client, m.path)
                )
              : {
                  // Articles reject GIF media, so the tweet pipeline (which
                  // converts every image to GIF) can't be reused for them -
                  // article images are uploaded as JPEG with the tweet_image
                  // category the article references them by.
                  mediaId: await this.uploadWithRateLimitRetry(async () =>
                    asArticleImage
                      ? client.v2.uploadMedia(
                          await sharp(await readOrFetch(m.path))
                            .resize({
                              width: 1000,
                            })
                            .jpeg()
                            .toBuffer(),
                          {
                            media_type: 'image/jpeg' as any,
                            media_category: 'tweet_image' as any,
                          }
                        )
                      : client.v2.uploadMedia(
                          await sharp(await readOrFetch(m.path), {
                            animated: lookup(m.path) === 'image/gif',
                          })
                            .resize({
                              width: 1000,
                            })
                            .gif()
                            .toBuffer(),
                          {
                            media_type: (lookup(m.path) || '') as any,
                          }
                        )
                  ),
                  processing: false,
                },
          true
        );

        if (!uploaded?.mediaId) {
          continue;
        }

        media[p.id] = media[p.id] || [];
        media[p.id].push(uploaded.mediaId);

        if (uploaded.processing) {
          processingIds.push(uploaded.mediaId);
        }
      }
    }

    return { media, processingIds };
  }

  // Legacy blocking upload (comments, and pre-v1.0.6 workflows through
  // post()): waits for the processing inside the activity like before.
  private async uploadMedia(
    client: TwitterApi,
    postDetails: PostDetails<any>[]
  ) {
    const { media, processingIds } = await this.uploadMediaEntries(
      client,
      postDetails
    );

    for (const mediaId of processingIds) {
      await this.waitForMediaProcessing(client, mediaId);
    }

    return media;
  }

  async postPending(
    id: string,
    accessToken: string,
    postDetails: PostDetails<{
      active_thread_finisher: boolean;
      thread_finisher: string;
      community?: string;
      who_can_reply_post:
        | 'everyone'
        | 'following'
        | 'mentionedUsers'
        | 'subscribers'
        | 'verified';
      made_with_ai?: boolean;
      paid_partnership?: boolean;
      post_type?: 'post' | 'article';
      article_title?: string;
      article_status?: 'draft' | 'published';
      article_cover?: { id: string; path: string };
    }>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const client = await this.getClient(accessToken);
    const [firstPost] = postDetails;
    const isArticle = firstPost?.settings?.post_type === 'article';

    // Upload the media now; the transcoding wait moves to checkPostStatus and
    // the tweet itself is only created by finalizePost, so nothing here is
    // irreversible - a failure leaves only orphaned media.
    const { media, processingIds } = await this.uploadMediaEntries(
      client,
      [firstPost],
      isArticle
    );

    // The article cover is picked in the settings, separate from the post
    // media (which is embedded in the article body).
    const coverPath = isArticle
      ? firstPost?.settings?.article_cover?.path
      : undefined;
    const coverMediaId = coverPath
      ? (
          await this.uploadMediaEntries(
            client,
            [{ id: 'article-cover', media: [{ path: coverPath }] } as any],
            true
          )
        ).media['article-cover']?.[0]
      : undefined;

    return [
      {
        id: firstPost.id,
        releaseURL: '',
        postId: '',
        status: 'pending',
        pendingData: {
          // Articles keep the HTML (converted to Draft.js in finalizePost),
          // tweets are flattened to plain text.
          message: isArticle
            ? firstPost.message
            : this.toTweetText(firstPost.message),
          settings: {
            who_can_reply_post: firstPost?.settings?.who_can_reply_post,
            community: firstPost?.settings?.community,
            made_with_ai: firstPost?.settings?.made_with_ai,
            paid_partnership: firstPost?.settings?.paid_partnership,
            post_type: firstPost?.settings?.post_type,
            article_title: firstPost?.settings?.article_title,
            article_status: firstPost?.settings?.article_status,
          },
          mediaIds: (media[firstPost.id] || []).filter((f) => f),
          ...(coverMediaId ? { coverMediaId } : {}),
          processingIds,
        } as XPendingData,
      },
    ];
  }

  override async checkPostStatus(
    accessToken: string,
    pendingData: XPendingData,
    integration: Integration
  ): Promise<PendingCheckResponse> {
    // A confirmed create attempt died without reporting its result: X gives
    // no cheap way to ask whether that tweet was created, so never run the
    // create again - stop with an explicit warning instead.
    if (pendingData.attempting && pendingData.confirmed) {
      throw new BadBody(
        this.identifier,
        '{}',
        Buffer.from('{}'),
        'X may have already published this post, please check your account before posting again to avoid duplicates'
      );
    }

    const client = await this.getClient(accessToken);

    // Check every media still transcoding; keep the ones not succeeded yet.
    const stillProcessing: string[] = [];
    for (const mediaId of pendingData.processingIds || []) {
      let processing:
        | { state: string; check_after_secs?: number; error?: { message?: string } }
        | undefined;
      try {
        processing = await this.mediaProcessingStatus(client, mediaId);
      } catch (err: any) {
        // twitter-api-v2 throws ApiResponseError, which never passes through
        // this.fetch/handleErrors: classify it here so revoked tokens and
        // suspended accounts fail properly instead of burning the whole check
        // budget as "transient".
        const body = JSON.stringify(err?.data || {});
        const handleError = this.handleErrors(body);

        if (err?.code === 401 || handleError?.type === 'refresh-token') {
          throw new RefreshToken(this.identifier, body, Buffer.from('{}'));
        }

        if (handleError?.type === 'bad-body') {
          throw new BadBody(
            this.identifier,
            body,
            Buffer.from('{}'),
            handleError.value
          );
        }

        // Transient status-check error: the media may finish transcoding just
        // fine, keep polling - if X stays broken the workflow exhausts its
        // checks and warns the user properly.
        return { status: 'pending', pendingData };
      }

      if (processing?.state === 'failed') {
        throw new BadBody(
          this.identifier,
          JSON.stringify(processing),
          Buffer.from('{}'),
          `X failed to process the uploaded video${
            processing?.error?.message ? `: ${processing.error.message}` : ''
          }`
        );
      }

      // A missing processing_info means the media is ready to use.
      if (processing && processing.state !== 'succeeded') {
        stillProcessing.push(mediaId);
      }
    }

    if (stillProcessing.length) {
      return {
        status: 'pending',
        pendingData: { ...pendingData, processingIds: stillProcessing },
      };
    }

    // witness the armed create so finalizePost knows the attempt is uniquely
    // accounted for before it mutates anything
    if (pendingData.attempting && !pendingData.confirmed) {
      return {
        status: 'ready',
        pendingData: { ...pendingData, processingIds: [], confirmed: true },
      };
    }

    return {
      status: 'ready',
      pendingData: { ...pendingData, processingIds: [] },
    };
  }

  // Converts the editor HTML (already sanitized by stripHtmlValidation's
  // 'html' mode - only p, h1-h3, ul, li, strong, u and a survive) into the
  // content_state the X Articles API expects, embedding the post media as
  // atomic image blocks at the end (the cover travels separately).
  // X's schema is a snake_case Draft.js dialect with additionalProperties
  // disallowed: blocks only accept key/text/type/data/entity_ranges/
  // inline_style_ranges (no depth).
  private articleContentState(html: string, embeddedMediaIds: string[]) {
    const blocks: any[] = [];
    const entities: any[] = [];

    const walkInline = (
      node: any,
      ctx: { text: string; styles: any[]; entityRanges: any[] }
    ) => {
      for (const child of node.childNodes || []) {
        if (child.nodeName === '#text') {
          ctx.text += child.value || '';
          continue;
        }

        const offset = ctx.text.length;
        walkInline(child, ctx);
        const length = ctx.text.length - offset;
        if (!length) {
          continue;
        }

        if (child.nodeName === 'strong') {
          ctx.styles.push({ offset, length, style: 'bold' });
        }

        if (child.nodeName === 'a') {
          const url = (child.attrs || []).find(
            (a: any) => a.name === 'href'
          )?.value;
          if (url) {
            const key = entities.length;
            entities.push({
              key: String(key),
              value: {
                type: 'link',
                mutability: 'mutable',
                data: { url },
              },
            });
            ctx.entityRanges.push({ offset, length, key });
          }
        }
      }
    };

    const makeBlock = (
      text: string,
      type: string,
      styles: any[] = [],
      entityRanges: any[] = []
    ) => ({
      key: `b${blocks.length}`,
      text,
      type,
      ...(styles.length ? { inline_style_ranges: styles } : {}),
      ...(entityRanges.length ? { entity_ranges: entityRanges } : {}),
    });

    const pushBlock = (node: any, type: string) => {
      const ctx = { text: '', styles: [] as any[], entityRanges: [] as any[] };
      walkInline(node, ctx);
      if (!ctx.text.trim()) {
        return;
      }
      blocks.push(makeBlock(ctx.text, type, ctx.styles, ctx.entityRanges));
    };

    const fragment = parseFragment(html) as any;
    for (const node of fragment.childNodes || []) {
      switch (node.nodeName) {
        case 'h1':
          pushBlock(node, 'header-one');
          break;
        case 'h2':
          pushBlock(node, 'header-two');
          break;
        case 'h3':
          // header-three is documented as valid but X's draft endpoint 503s on
          // it (https://devcommunity.x.com/t/-/271312), downgrade to header-two
          // until X fixes their side.
          pushBlock(node, 'header-two');
          break;
        case 'ul':
        case 'ol':
          for (const li of (node.childNodes || []).filter(
            (n: any) => n.nodeName === 'li'
          )) {
            pushBlock(
              li,
              node.nodeName === 'ol'
                ? 'ordered-list-item'
                : 'unordered-list-item'
            );
          }
          break;
        case '#text':
          if ((node.value || '').trim()) {
            blocks.push(makeBlock(node.value, 'unstyled'));
          }
          break;
        default:
          pushBlock(node, 'unstyled');
          break;
      }
    }

    // The API requires at least one block.
    if (!blocks.length) {
      blocks.push(makeBlock(stripHtmlValidation('none', html), 'unstyled'));
    }

    for (const mediaId of embeddedMediaIds) {
      const key = entities.length;
      entities.push({
        key: String(key),
        value: {
          type: 'image',
          mutability: 'immutable',
          data: {
            media_items: [
              // Must match the category the media was uploaded with -
              // lowercase, like the upload endpoint (the uppercase
              // TWEET_IMAGE in the docs example is wrong).
              { media_category: 'tweet_image', media_id: mediaId },
            ],
          },
        },
      });
      blocks.push(
        makeBlock(' ', 'atomic', [], [{ offset: 0, length: 1, key }])
      );
    }

    return { blocks, entities };
  }

  private async finalizeArticle(
    accessToken: string,
    pendingData: XPendingData,
    integration: Integration
  ): Promise<PendingCheckResponse> {
    const [accessTokenSplit, accessSecretSplit] = accessToken.split(':');
    const settings = pendingData.settings || {};
    const coverMediaId = pendingData.coverMediaId;
    // All the post media is embedded in the article body; the cover comes
    // from its own settings field.
    const embeddedMediaIds = (pendingData.mediaIds || []).filter((f) => f);

    const draftUrl = 'https://api.x.com/2/articles/draft';
    const draftResponse = await this.fetch(draftUrl, {
      method: 'POST',
      headers: {
        Authorization: this.signOAuth1(
          'POST',
          draftUrl,
          accessTokenSplit,
          accessSecretSplit
        ),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: settings.article_title,
        content_state: this.articleContentState(
          pendingData.message,
          embeddedMediaIds
        ),
        ...(coverMediaId
          ? {
              cover_media: {
                // Lowercase, matching the category the upload stored.
                media_category: 'tweet_image',
                media_id: coverMediaId,
              },
            }
          : {}),
      }),
    });
    const draftJson = (await draftResponse.json()) as {
      data?: { id: string };
      errors?: any[];
    };

    // The articles endpoints can return 2xx with an errors array (e.g. a
    // rejected cover) - don't swallow it.
    if (draftJson?.errors?.length) {
      console.log(
        'X article draft returned errors:',
        JSON.stringify(draftJson.errors)
      );
    }

    if (!draftJson?.data?.id) {
      throw new BadBody(
        this.identifier,
        JSON.stringify(draftJson),
        Buffer.from('{}'),
        'X could not create the article draft'
      );
    }

    if (settings.article_status !== 'published') {
      return {
        status: 'completed',
        postId: draftJson.data.id,
        releaseURL: `https://x.com/i/articles`,
      };
    }

    const publishUrl = `https://api.x.com/2/articles/${draftJson.data.id}/publish`;
    const publishResponse = await this.fetch(publishUrl, {
      method: 'POST',
      headers: {
        Authorization: this.signOAuth1(
          'POST',
          publishUrl,
          accessTokenSplit,
          accessSecretSplit
        ),
        'Content-Type': 'application/json',
      },
    });
    const publishJson = (await publishResponse.json()) as {
      data?: { post_id: string };
      errors?: any[];
    };

    if (publishJson?.errors?.length) {
      console.log(
        'X article publish returned errors:',
        JSON.stringify(publishJson.errors)
      );
    }

    if (!publishJson?.data?.post_id) {
      throw new BadBody(
        this.identifier,
        JSON.stringify(publishJson),
        Buffer.from('{}'),
        'X created the article draft but could not publish it, check your drafts on X'
      );
    }

    return {
      status: 'completed',
      postId: publishJson.data.post_id,
      releaseURL: `https://twitter.com/${integration.profile}/status/${publishJson.data.post_id}`,
    };
  }

  override async finalizePost(
    accessToken: string,
    pendingData: XPendingData,
    integration: Integration
  ): Promise<PendingCheckResponse> {
    // Create with an arm -> confirm -> publish handshake: the create only runs
    // after checkPostStatus witnessed the intent, so a run that dies
    // mid-create is detectable and the tweet is never published twice. The
    // same protection covers articles - creating a draft isn't idempotent
    // either.
    if (!pendingData.attempting || !pendingData.confirmed) {
      return {
        status: 'pending',
        pendingData: { ...pendingData, attempting: true, confirmed: false },
      };
    }

    if (pendingData.settings?.post_type === 'article') {
      return this.finalizeArticle(accessToken, pendingData, integration);
    }

    const [accessTokenSplit, accessSecretSplit] = accessToken.split(':');
    const settings = pendingData.settings || {};
    const mediaIds = (pendingData.mediaIds || []).filter((f) => f);

    const tweetUrl = 'https://api.x.com/2/tweets';
    const tweetBody = {
      ...(!settings.who_can_reply_post ||
      settings.who_can_reply_post === 'everyone'
        ? {}
        : {
            reply_settings: settings.who_can_reply_post,
          }),
      ...(settings.community
        ? {
            share_with_followers: true,
            community_id: settings.community?.split('/').pop() || '',
          }
        : {}),
      text: this.stripLinks()
        ? removeLinks(pendingData.message)
        : pendingData.message,
      ...(mediaIds.length ? { media: { media_ids: mediaIds } } : {}),
      made_with_ai: this.assetBoolean(settings.made_with_ai),
      paid_partnership: this.assetBoolean(settings.paid_partnership),
    };

    const tweetResponse = await this.fetch(tweetUrl, {
      method: 'POST',
      headers: {
        Authorization: this.signOAuth1(
          'POST',
          tweetUrl,
          accessTokenSplit,
          accessSecretSplit
        ),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetBody),
    });
    const { data } = (await tweetResponse.json()) as {
      data: { id: string };
    };

    return {
      status: 'completed',
      postId: data.id,
      releaseURL: `https://twitter.com/${integration.profile}/status/${data.id}`,
    };
  }

  // Old blocking behavior, kept for workflow versions before v1.0.6 that still
  // run and don't know how to resolve a `pending` response - they wait for the
  // transcoding and create the tweet inside the activity like before.
  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<{
      active_thread_finisher: boolean;
      thread_finisher: string;
      community?: string;
      who_can_reply_post:
        | 'everyone'
        | 'following'
        | 'mentionedUsers'
        | 'subscribers'
        | 'verified';
      made_with_ai?: boolean;
      paid_partnership?: boolean;
    }>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [response] = await this.postPending(
      id,
      accessToken,
      postDetails,
      integration
    );

    let pendingData = response.pendingData;
    const started = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Cap below the 10-minute activity timeout of the old workflows using
      // this method: failing here is safe (the tweet is only created once the
      // media is ready), timing the activity out is not - a retried activity
      // would upload and publish again.
      if (Date.now() - started > 8 * 60 * 1000) {
        throw new BadBody(
          this.identifier,
          '{}',
          Buffer.from('{}'),
          'X took too long to process the media, please try again'
        );
      }

      const check = await this.checkPostStatus(
        accessToken,
        pendingData,
        integration
      );

      if (check.status === 'pending') {
        pendingData = check.pendingData;
        await timer(20000);
        continue;
      }

      const result =
        check.status === 'ready'
          ? await this.finalizePost(accessToken, check.pendingData, integration)
          : check;

      if (result.status === 'completed') {
        return [
          {
            postId: result.postId,
            id: response.id,
            releaseURL: result.releaseURL,
            status: 'posted',
          },
        ];
      }

      // finalize only armed the handshake (nothing to wait for), loop straight
      // into the witnessing check
      pendingData = result.pendingData;
    }
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails<{
      active_thread_finisher: boolean;
      thread_finisher: string;
      made_with_ai?: boolean;
      paid_partnership?: boolean;
    }>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [accessTokenSplit, accessSecretSplit] = accessToken.split(':');
    const client = await this.getClient(accessToken);
    const [commentPost] = postDetails;

    // upload media for the comment
    const uploadAll = await this.uploadMedia(client, [commentPost]);

    const media_ids = (uploadAll[commentPost.id] || []).filter((f) => f);

    const replyToId = lastCommentId || postId;

    // Comments are always tweets - flatten the editor HTML to plain text.
    const commentText = this.toTweetText(commentPost.message);

    const tweetUrl = 'https://api.x.com/2/tweets';
    const tweetBody = {
      text: this.stripLinks() ? removeLinks(commentText) : commentText,
      ...(media_ids.length ? { media: { media_ids } } : {}),
      reply: { in_reply_to_tweet_id: replyToId },
      made_with_ai: this.assetBoolean(commentPost?.settings?.made_with_ai),
      paid_partnership: this.assetBoolean(
        commentPost?.settings?.paid_partnership
      ),
    };

    const tweetResponse = await this.fetch(tweetUrl, {
      method: 'POST',
      headers: {
        Authorization: this.signOAuth1(
          'POST',
          tweetUrl,
          accessTokenSplit,
          accessSecretSplit
        ),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetBody),
    });
    const { data } = (await tweetResponse.json()) as {
      data: { id: string };
    };

    return [
      {
        postId: data.id,
        id: commentPost.id,
        releaseURL: `https://twitter.com/${integration.profile}/status/${data.id}`,
        status: 'posted',
      },
    ];
  }

  private loadAllTweets = async (
    client: TwitterApi,
    id: string,
    until: string,
    since: string,
    token = ''
  ): Promise<TweetV2[]> => {
    const tweets = await client.v2.userTimeline(id, {
      'tweet.fields': ['id'],
      'user.fields': [],
      'poll.fields': [],
      'place.fields': [],
      'media.fields': [],
      exclude: ['replies', 'retweets'],
      start_time: since,
      end_time: until,
      max_results: 100,
      ...(token ? { pagination_token: token } : {}),
    });

    return [
      ...tweets.data.data,
      ...(tweets.data.data.length === 100
        ? await this.loadAllTweets(
            client,
            id,
            until,
            since,
            tweets.meta.next_token
          )
        : []),
    ];
  };

  async analytics(
    id: string,
    accessToken: string,
    date: number
  ): Promise<AnalyticsData[]> {
    if (process.env.DISABLE_X_ANALYTICS) {
      return [];
    }

    const until = dayjs().endOf('day');
    const since = dayjs().subtract(date > 100 ? 100 : date, 'day');

    const [accessTokenSplit, accessSecretSplit] = accessToken.split(':');
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: accessTokenSplit,
      accessSecret: accessSecretSplit,
    });

    try {
      const tweets = uniqBy(
        await this.loadAllTweets(
          client,
          id,
          until.format('YYYY-MM-DDTHH:mm:ssZ'),
          since.format('YYYY-MM-DDTHH:mm:ssZ')
        ),
        (p) => p.id
      );

      if (tweets.length === 0) {
        return [];
      }

      const data = await client.v2.tweets(
        tweets.map((p) => p.id),
        {
          'tweet.fields': ['public_metrics'],
        }
      );

      const metrics = data.data.reduce(
        (all, current) => {
          all.impression_count =
            (all.impression_count || 0) +
            +current.public_metrics.impression_count;
          all.bookmark_count =
            (all.bookmark_count || 0) + +current.public_metrics.bookmark_count;
          all.like_count =
            (all.like_count || 0) + +current.public_metrics.like_count;
          all.quote_count =
            (all.quote_count || 0) + +current.public_metrics.quote_count;
          all.reply_count =
            (all.reply_count || 0) + +current.public_metrics.reply_count;
          all.retweet_count =
            (all.retweet_count || 0) + +current.public_metrics.retweet_count;

          return all;
        },
        {
          impression_count: 0,
          bookmark_count: 0,
          like_count: 0,
          quote_count: 0,
          reply_count: 0,
          retweet_count: 0,
        }
      );

      return Object.entries(metrics).map(([key, value]) => ({
        label: key.replace('_count', '').replace('_', ' ').toUpperCase(),
        percentageChange: 5,
        data: [
          {
            total: String(0),
            date: since.format('YYYY-MM-DD'),
          },
          {
            total: String(value),
            date: until.format('YYYY-MM-DD'),
          },
        ],
      }));
    } catch (err) {
      console.log(err);
    }
    return [];
  }

  async postAnalytics(
    integrationId: string,
    accessToken: string,
    postId: string,
    date: number
  ): Promise<AnalyticsData[]> {
    if (process.env.DISABLE_X_ANALYTICS) {
      return [];
    }

    const today = dayjs().format('YYYY-MM-DD');

    const [accessTokenSplit, accessSecretSplit] = accessToken.split(':');
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: accessTokenSplit,
      accessSecret: accessSecretSplit,
    });

    try {
      // Fetch the specific tweet with public metrics
      const tweet = await client.v2.singleTweet(postId, {
        'tweet.fields': ['public_metrics', 'created_at'],
      });

      if (!tweet?.data?.public_metrics) {
        return [];
      }

      const metrics = tweet.data.public_metrics;

      const result: AnalyticsData[] = [];

      if (metrics.impression_count !== undefined) {
        result.push({
          label: 'Impressions',
          percentageChange: 0,
          data: [{ total: String(metrics.impression_count), date: today }],
        });
      }

      if (metrics.like_count !== undefined) {
        result.push({
          label: 'Likes',
          percentageChange: 0,
          data: [{ total: String(metrics.like_count), date: today }],
        });
      }

      if (metrics.retweet_count !== undefined) {
        result.push({
          label: 'Retweets',
          percentageChange: 0,
          data: [{ total: String(metrics.retweet_count), date: today }],
        });
      }

      if (metrics.reply_count !== undefined) {
        result.push({
          label: 'Replies',
          percentageChange: 0,
          data: [{ total: String(metrics.reply_count), date: today }],
        });
      }

      if (metrics.quote_count !== undefined) {
        result.push({
          label: 'Quotes',
          percentageChange: 0,
          data: [{ total: String(metrics.quote_count), date: today }],
        });
      }

      if (metrics.bookmark_count !== undefined) {
        result.push({
          label: 'Bookmarks',
          percentageChange: 0,
          data: [{ total: String(metrics.bookmark_count), date: today }],
        });
      }

      return result;
    } catch (err) {
      console.log('Error fetching X post analytics:', err);
    }

    return [];
  }

  override async mention(token: string, d: { query: string }) {
    const [accessTokenSplit, accessSecretSplit] = token.split(':');
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: accessTokenSplit,
      accessSecret: accessSecretSplit,
    });

    try {
      const data = await client.v2.userByUsername(d.query, {
        'user.fields': ['username', 'name', 'profile_image_url'],
      });

      if (!data?.data?.username) {
        return [];
      }

      return [
        {
          id: data.data.username,
          image: data.data.profile_image_url,
          label: data.data.name,
        },
      ];
    } catch (err) {
      console.log(err);
    }
    return [];
  }

  mentionFormat(idOrHandle: string, name: string) {
    return `@${idOrHandle}`;
  }
}
