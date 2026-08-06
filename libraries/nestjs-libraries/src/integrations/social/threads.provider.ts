import {
  AnalyticsData,
  AuthTokenDetails,
  PendingCheckResponse,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { timer } from '@gitroom/helpers/utils/timer';
import dayjs from 'dayjs';
import {
  BadBody,
  SocialAbstract,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { capitalize, chunk } from 'lodash';
import { Plug } from '@gitroom/helpers/decorators/plug.decorator';
import { Integration } from '@prisma/client';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';

export class ThreadsProvider extends SocialAbstract implements SocialProvider {
  identifier = 'threads';
  name = 'Threads';
  isBetweenSteps = false;
  scopes = [
    'threads_basic',
    'threads_content_publish',
    'threads_manage_replies',
    'threads_manage_insights',
    // 'threads_profile_discovery',
  ];
  override maxConcurrentJob = 2; // Threads has moderate rate limits
  refreshCron = true;

  editor = 'normal' as const;
  maxLength() {
    return 500;
  }

  override handleErrors(body: string):
    | {
        type: 'refresh-token' | 'bad-body';
        value: string;
      }
    | undefined {
    console.log(body);
    if (body.includes('Error validating access token')) {
      return { type: 'refresh-token', value: 'Threads access token expired' };
    }

    if (body.includes('2207051')) {
      return {
        type: 'bad-body',
        value:
          'Error from Meta: We restrict certain activity to protect our community',
      };
    }

    if (body.includes('4279013')) {
      return {
        type: 'bad-body',
        value:
          'User restricted',
      };
    }
    if (body.includes('The media could not be fetched from this URI')) {
      return {
        type: 'bad-body',
        value:
          "One of the media URLs is invalid or inaccessible, make sure it's being uploaded to Postiz first",
      };
    }
    if (body.includes('text must be at most 500 characters')) {
      return {
        type: 'bad-body',
        value: 'Post text exceeds 500 characters limit',
      };
    }

    return undefined;
  }

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    const { access_token } = await (
      await this.fetch(
        `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${refresh_token}`
      )
    ).json();

    const { id, name, username, picture } = await this.fetchUserInfo(
      access_token
    );

    return {
      id,
      name,
      accessToken: access_token,
      refreshToken: access_token,
      expiresIn: dayjs().add(58, 'days').unix() - dayjs().unix(),
      picture: picture || '',
      username: '',
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url:
        'https://www.threads.net/oauth/authorize' +
        `?client_id=${process.env.THREADS_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(
          `${
            process?.env.FRONTEND_URL?.indexOf('https') == -1
              ? `https://redirectmeto.com/${process?.env.FRONTEND_URL}`
              : `${process?.env.FRONTEND_URL}`
          }/integrations/social/threads`
        )}` +
        `&state=${state}` +
        `&scope=${encodeURIComponent(this.scopes.join(','))}`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const getAccessToken = await (
      await this.fetch(
        'https://graph.threads.net/oauth/access_token' +
          `?client_id=${process.env.THREADS_APP_ID}` +
          `&redirect_uri=${encodeURIComponent(
            `${
              process?.env.FRONTEND_URL?.indexOf('https') == -1
                ? `https://redirectmeto.com/${process?.env.FRONTEND_URL}`
                : `${process?.env.FRONTEND_URL}`
            }/integrations/social/threads`
          )}` +
          `&grant_type=authorization_code` +
          `&client_secret=${process.env.THREADS_APP_SECRET}` +
          `&code=${params.code}`
      )
    ).json();

    const { access_token } = await (
      await this.fetch(
        'https://graph.threads.net/access_token' +
          '?grant_type=th_exchange_token' +
          `&client_secret=${process.env.THREADS_APP_SECRET}` +
          `&access_token=${getAccessToken.access_token}`
      )
    ).json();

    const { id, name, username, picture } = await this.fetchUserInfo(
      access_token
    );

    return {
      id,
      name,
      accessToken: access_token,
      refreshToken: access_token,
      expiresIn: dayjs().add(58, 'days').unix() - dayjs().unix(),
      picture: picture || '',
      username: username,
    };
  }

  // Single, read-only status check of a media container - no loops and no
  // timers, so the post workflow can poll it with durable timers.
  private async checkContainerStatus(
    mediaContainerId: string,
    accessToken: string
  ): Promise<'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED'> {
    const { status, error_message } = await (
      await this.fetch(
        `https://graph.threads.net/v1.0/${mediaContainerId}?fields=status,error_message&access_token=${accessToken}`
      )
    ).json();

    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new BadBody(
        this.identifier,
        JSON.stringify({ status, error_message }),
        '{}',
        error_message || 'Threads could not process the media'
      );
    }

    if (status === 'FINISHED' || status === 'PUBLISHED') {
      return status;
    }

    return 'IN_PROGRESS';
  }

  private async checkLoaded(
    mediaContainerId: string,
    accessToken: string
  ): Promise<boolean> {
    // Bounded (the old version recursed forever and could hang the activity
    // into a timeout): ~5.5 minutes at 2.2s intervals.
    for (let i = 0; i < 150; i++) {
      const status = await this.checkContainerStatus(
        mediaContainerId,
        accessToken
      );

      if (status === 'FINISHED' || status === 'PUBLISHED') {
        await timer(2000);
        return true;
      }

      await timer(2200);
    }

    throw new BadBody(
      this.identifier,
      '{}',
      '{}',
      'Threads took too long to process the media, please try again'
    );
  }

  private async fetchUserInfo(accessToken: string) {
    const { id, username, threads_profile_picture_url } = await (
      await this.fetch(
        `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`
      )
    ).json();

    return {
      id,
      name: username,
      picture: threads_profile_picture_url || '',
      username,
    };
  }

  private async createSingleMediaContent(
    userId: string,
    accessToken: string,
    media: { path: string },
    message: string,
    isCarouselItem = false,
    replyToId?: string
  ): Promise<string> {
    const mediaType = hasExtension(media.path, 'mp4')
      ? 'video_url'
      : 'image_url';
    const mediaParams = new URLSearchParams({
      ...(mediaType === 'video_url' ? { video_url: media.path } : {}),
      ...(mediaType === 'image_url' ? { image_url: media.path } : {}),
      ...(isCarouselItem ? { is_carousel_item: 'true' } : {}),
      ...(replyToId ? { reply_to_id: replyToId } : {}),
      media_type: mediaType === 'video_url' ? 'VIDEO' : 'IMAGE',
      text: message,
      access_token: accessToken,
    });

    const { id: mediaId } = await (
      await this.fetch(
        `https://graph.threads.net/v1.0/${userId}/threads?${mediaParams.toString()}`,
        {
          method: 'POST',
        }
      )
    ).json();

    return mediaId;
  }

  private async createCarouselContent(
    userId: string,
    accessToken: string,
    media: { path: string }[],
    message: string,
    replyToId?: string
  ): Promise<string> {
    // Create each media item
    const mediaIds = [];
    for (const mediaItem of media) {
      const mediaId = await this.createSingleMediaContent(
        userId,
        accessToken,
        mediaItem,
        message,
        true
      );
      mediaIds.push(mediaId);
    }

    // Wait for all media to be loaded
    await Promise.all(
      mediaIds.map((id: string) => this.checkLoaded(id, accessToken))
    );

    // Create carousel container
    const params = new URLSearchParams({
      text: message,
      media_type: 'CAROUSEL',
      children: mediaIds.join(','),
      ...(replyToId ? { reply_to_id: replyToId } : {}),
      access_token: accessToken,
    });

    const { id: containerId } = await (
      await this.fetch(
        `https://graph.threads.net/v1.0/${userId}/threads?${params.toString()}`,
        {
          method: 'POST',
        }
      )
    ).json();

    return containerId;
  }

  private async createTextContent(
    userId: string,
    accessToken: string,
    message: string,
    replyToId?: string,
    quoteId?: string
  ): Promise<string> {
    const form = new FormData();
    form.append('media_type', 'TEXT');
    form.append('text', message);
    form.append('access_token', accessToken);

    if (replyToId) {
      form.append('reply_to_id', replyToId);
    }

    if (quoteId) {
      form.append('quote_post_id', quoteId);
    }

    const { id: contentId, ...all } = await (
      await this.fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
        method: 'POST',
        body: form,
      })
    ).json();

    return contentId;
  }

  private async publishThread(
    userId: string,
    accessToken: string,
    creationId: string
  ): Promise<{ threadId: string; permalink: string }> {
    await this.checkLoaded(creationId, accessToken);

    const { id: threadId } = await (
      await this.fetch(
        `https://graph.threads.net/v1.0/${userId}/threads_publish?creation_id=${creationId}&access_token=${accessToken}`,
        {
          method: 'POST',
        }
      )
    ).json();

    const { permalink } = await (
      await this.fetch(
        `https://graph.threads.net/v1.0/${threadId}?fields=id,permalink&access_token=${accessToken}`
      )
    ).json();

    return { threadId, permalink };
  }

  private async createThreadContent(
    userId: string,
    accessToken: string,
    postDetails: PostDetails,
    replyToId?: string,
    quoteId?: string
  ): Promise<string> {
    // Handle content creation based on media type
    if (!postDetails.media || postDetails.media.length === 0) {
      // Text-only content
      return await this.createTextContent(
        userId,
        accessToken,
        postDetails.message,
        replyToId,
        quoteId
      );
    } else if (postDetails.media.length === 1) {
      // Single media content
      return await this.createSingleMediaContent(
        userId,
        accessToken,
        postDetails.media[0],
        postDetails.message,
        false,
        replyToId
      );
    } else {
      // Carousel content
      return await this.createCarouselContent(
        userId,
        accessToken,
        postDetails.media,
        postDetails.message,
        replyToId
      );
    }
  }

  // The thread is live, the permalink is only cosmetic: never fail (and risk
  // re-publishing) a live post over it.
  private async threadPermalink(
    threadId: string,
    accessToken: string,
    integration: Integration
  ): Promise<string> {
    try {
      const { permalink } = await (
        await this.fetch(
          `https://graph.threads.net/v1.0/${threadId}?fields=id,permalink&access_token=${accessToken}`
        )
      ).json();
      return permalink;
    } catch (err) {
      return `https://www.threads.net/@${integration.profile}`;
    }
  }

  async postPending(
    userId: string,
    accessToken: string,
    postDetails: PostDetails<{
      active_thread_finisher: boolean;
      thread_finisher: string;
    }>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    if (!postDetails.length) {
      return [];
    }

    const [firstPost] = postDetails;

    // Carousels: only create the child containers here, the carousel container
    // itself is created by finalizePost once the children are processed.
    if ((firstPost.media?.length || 0) > 1) {
      const childIds = [];
      for (const mediaItem of firstPost.media!) {
        childIds.push(
          await this.createSingleMediaContent(
            userId,
            accessToken,
            mediaItem,
            firstPost.message,
            true
          )
        );
      }

      return [
        {
          id: firstPost.id,
          postId: '',
          releaseURL: '',
          status: 'pending',
          pendingData: {
            step: 'children',
            childIds,
            message: firstPost.message,
          },
        },
      ];
    }

    // Text / single media: one container, nothing is visible until
    // threads_publish runs in finalizePost.
    const containerId =
      !firstPost.media || firstPost.media.length === 0
        ? await this.createTextContent(userId, accessToken, firstPost.message)
        : await this.createSingleMediaContent(
            userId,
            accessToken,
            firstPost.media[0],
            firstPost.message,
            false
          );

    return [
      {
        id: firstPost.id,
        postId: '',
        releaseURL: '',
        status: 'pending',
        pendingData: { step: 'container', containerId },
      },
    ];
  }

  override async checkPostStatus(
    accessToken: string,
    pendingData: {
      step: 'children' | 'container';
      childIds?: string[];
      containerId?: string;
      message?: string;
    },
    integration: Integration
  ): Promise<PendingCheckResponse> {
    // waiting for the carousel children to be processed
    if (pendingData.step === 'children') {
      for (const childId of pendingData.childIds || []) {
        const status = await this.checkContainerStatus(childId, accessToken);
        if (status === 'IN_PROGRESS') {
          return { status: 'pending', pendingData };
        }
      }

      // all children processed, finalizePost creates the carousel container
      return { status: 'ready', pendingData };
    }

    const status = await this.checkContainerStatus(
      pendingData.containerId!,
      accessToken
    );

    if (status === 'IN_PROGRESS') {
      return { status: 'pending', pendingData };
    }

    // a previous finalizePost published but died before reporting: the post is
    // live, never publish again
    if (status === 'PUBLISHED') {
      return {
        status: 'completed',
        postId: pendingData.containerId!,
        releaseURL: `https://www.threads.net/@${integration.profile}`,
      };
    }

    return { status: 'ready', pendingData };
  }

  override async finalizePost(
    accessToken: string,
    pendingData: {
      step: 'children' | 'container';
      childIds?: string[];
      containerId?: string;
      message?: string;
    },
    integration: Integration
  ): Promise<PendingCheckResponse> {
    // the carousel children are processed: create the carousel container and
    // hand back to the workflow to wait for it (an orphan container from a
    // crashed run is invisible, so re-running this is safe)
    if (pendingData.step === 'children') {
      const params = new URLSearchParams({
        text: pendingData.message || '',
        media_type: 'CAROUSEL',
        children: (pendingData.childIds || []).join(','),
        access_token: accessToken,
      });

      const { id: containerId } = await (
        await this.fetch(
          `https://graph.threads.net/v1.0/${integration.internalId}/threads?${params.toString()}`,
          {
            method: 'POST',
          }
        )
      ).json();

      return {
        status: 'pending',
        pendingData: { step: 'container', containerId },
      };
    }

    const { id: threadId } = await (
      await this.fetch(
        `https://graph.threads.net/v1.0/${integration.internalId}/threads_publish?creation_id=${pendingData.containerId}&access_token=${accessToken}`,
        {
          method: 'POST',
        }
      )
    ).json();

    return {
      status: 'completed',
      postId: threadId,
      releaseURL: await this.threadPermalink(threadId, accessToken, integration),
    };
  }

  // Old blocking behavior, kept for workflow versions before v1.0.6 that don't
  // know how to resolve a `pending` response.
  async post(
    userId: string,
    accessToken: string,
    postDetails: PostDetails<{
      active_thread_finisher: boolean;
      thread_finisher: string;
    }>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    if (!postDetails.length) {
      return [];
    }

    const [firstPost] = postDetails;
    const [response] = await this.postPending(
      userId,
      accessToken,
      postDetails,
      integration
    );

    let pendingData = response.pendingData;
    const started = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Cap below the 10-minute activity timeout of the old workflows using
      // this method: failing here (non-retryable) is safe, timing the
      // activity out is not - a retried activity would publish again.
      if (Date.now() - started > 8 * 60 * 1000) {
        throw new BadBody(
          this.identifier,
          '{}',
          '{}',
          'Threads took too long to process the media, please try again'
        );
      }

      const check = await this.checkPostStatus(
        accessToken,
        pendingData,
        integration
      );

      if (check.status === 'pending') {
        pendingData = check.pendingData;
        await timer(2200);
        continue;
      }

      const result =
        check.status === 'ready'
          ? await this.finalizePost(accessToken, check.pendingData, integration)
          : check;

      if (result.status === 'completed') {
        return [
          {
            id: firstPost.id,
            postId: result.postId,
            status: 'success',
            releaseURL: result.releaseURL,
          },
        ];
      }

      pendingData = result.pendingData;
      await timer(2200);
    }
  }

  async comment(
    userId: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails<{
      active_thread_finisher: boolean;
      thread_finisher: string;
    }>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    if (!postDetails.length) {
      return [];
    }

    const [commentPost] = postDetails;
    const replyToId = lastCommentId || postId;

    // Create reply content
    const replyContentId = await this.createThreadContent(
      userId,
      accessToken,
      commentPost,
      replyToId
    );

    // Publish the reply
    const { threadId: replyThreadId, permalink } = await this.publishThread(
      userId,
      accessToken,
      replyContentId
    );

    return [
      {
        id: commentPost.id,
        postId: replyThreadId,
        status: 'success',
        releaseURL: permalink,
      },
    ];
  }

  async analytics(
    id: string,
    accessToken: string,
    date: number
  ): Promise<AnalyticsData[]> {
    const until = dayjs().endOf('day').unix();
    const since = dayjs().subtract(date, 'day').unix();

    const { data, ...all } = await (
      await fetch(
        `https://graph.threads.net/v1.0/${id}/threads_insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}&period=day&since=${since}&until=${until}`
      )
    ).json();

    return (
      data?.map((d: any) => ({
        label: capitalize(d.name),
        percentageChange: 5,
        data: d.total_value
          ? [{ total: d.total_value.value, date: dayjs().format('YYYY-MM-DD') }]
          : d.values.map((v: any) => ({
              total: v.value,
              date: dayjs(v.end_time).format('YYYY-MM-DD'),
            })),
      })) || []
    );
  }

  @Plug({
    identifier: 'threads-autoPlugPost',
    title: 'Auto plug post',
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
    const { data } = await (
      await fetch(
        `https://graph.threads.net/v1.0/${id}/insights?metric=likes&access_token=${integration.token}`
      )
    ).json();

    const {
      values: [value],
    } = data.find((p: any) => p.name === 'likes');

    if (value.value >= fields.likesAmount) {
      await timer(2000);

      const form = new FormData();
      form.append('media_type', 'TEXT');
      form.append('text', stripHtmlValidation('normal', fields.post, true));
      form.append('reply_to_id', id);
      form.append('access_token', integration.token);

      const { id: replyId } = await (
        await this.fetch('https://graph.threads.net/v1.0/me/threads', {
          method: 'POST',
          body: form,
        })
      ).json();

      await (
        await this.fetch(
          `https://graph.threads.net/v1.0/${integration.internalId}/threads_publish?creation_id=${replyId}&access_token=${integration.token}`,
          {
            method: 'POST',
          }
        )
      ).json();
      return true;
    }

    return false;
  }

  async postAnalytics(
    integrationId: string,
    accessToken: string,
    postId: string,
    date: number
  ): Promise<AnalyticsData[]> {
    const today = dayjs().format('YYYY-MM-DD');

    try {
      // Fetch thread insights from Threads API
      const { data } = await (
        await fetch(
          `https://graph.threads.net/v1.0/${postId}/insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}`
        )
      ).json();

      if (!data || data.length === 0) {
        return [];
      }

      const result: AnalyticsData[] = [];

      for (const metric of data) {
        const value = metric.values?.[0]?.value ?? metric.total_value?.value;
        if (value === undefined) continue;

        let label = '';

        switch (metric.name) {
          case 'views':
            label = 'Views';
            break;
          case 'likes':
            label = 'Likes';
            break;
          case 'replies':
            label = 'Replies';
            break;
          case 'reposts':
            label = 'Reposts';
            break;
          case 'quotes':
            label = 'Quotes';
            break;
        }

        if (label) {
          result.push({
            label,
            percentageChange: 0,
            data: [{ total: String(value), date: today }],
          });
        }
      }

      return result;
    } catch (err) {
      console.error('Error fetching Threads post analytics:', err);
      return [];
    }
  }

  // override async mention(
  //   token: string,
  //   data: { query: string },
  //   id: string,
  //   integration: Integration
  // ) {
  //   const p = await (
  //     await fetch(
  //       `https://graph.threads.net/v1.0/profile_lookup?username=${data.query}&access_token=${integration.token}`
  //     )
  //   ).json();
  //
  //   return [
  //     {
  //       id: String(p.id),
  //       label: p.name,
  //       image: p.profile_picture_url,
  //     },
  //   ];
  // }
  //
  // mentionFormat(idOrHandle: string, name: string) {
  //   return `@${idOrHandle}`;
  // }
}
