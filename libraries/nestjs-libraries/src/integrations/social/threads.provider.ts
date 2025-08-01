import {
  AnalyticsData,
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { timer } from '@gitroom/helpers/utils/timer';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { capitalize, chunk } from 'lodash';
import { Plug } from '@gitroom/helpers/decorators/plug.decorator';
import { Integration } from '@prisma/client';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { TwitterApi } from 'twitter-api-v2';

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

  editor = 'normal' as const;

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    const { access_token } = await (
      await this.fetch(
        `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${refresh_token}`
      )
    ).json();

    const {
      id,
      name,
      username,
      picture: {
        data: { url },
      },
    } = await this.fetchPageInformation(access_token);

    return {
      id,
      name,
      accessToken: access_token,
      refreshToken: access_token,
      expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
      picture: url,
      username: '',
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url:
        'https://threads.net/oauth/authorize' +
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
          `&access_token=${getAccessToken.access_token}&fields=access_token,expires_in`
      )
    ).json();

    const {
      id,
      name,
      username,
      picture: {
        data: { url },
      },
    } = await this.fetchPageInformation(access_token);

    return {
      id,
      name,
      accessToken: access_token,
      refreshToken: access_token,
      expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
      picture: url,
      username: username,
    };
  }

  private async checkLoaded(
    mediaContainerId: string,
    accessToken: string
  ): Promise<boolean> {
    const { status, id, error_message } = await (
      await this.fetch(
        `https://graph.threads.net/v1.0/${mediaContainerId}?fields=status,error_message&access_token=${accessToken}`
      )
    ).json();

    if (status === 'ERROR') {
      throw new Error(id);
    }

    if (status === 'FINISHED') {
      await timer(2000);
      return true;
    }

    await timer(2200);
    return this.checkLoaded(mediaContainerId, accessToken);
  }

  async fetchPageInformation(accessToken: string) {
    const { id, username, threads_profile_picture_url, access_token } = await (
      await this.fetch(
        `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`
      )
    ).json();

    return {
      id,
      name: username,
      access_token,
      picture: { data: { url: threads_profile_picture_url } },
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
    const mediaType =
      media.path.indexOf('.mp4') > -1 ? 'video_url' : 'image_url';
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

    const { id: contentId } = await (
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

  async post(
    userId: string,
    accessToken: string,
    postDetails: PostDetails<{
      active_thread_finisher: boolean;
      thread_finisher: string;
    }>[]
  ): Promise<PostResponse[]> {
    if (!postDetails.length) {
      return [];
    }

    const [firstPost, ...replies] = postDetails;

    // Create the initial thread
    const initialContentId = await this.createThreadContent(
      userId,
      accessToken,
      firstPost
    );

    // Publish the thread
    const { threadId, permalink } = await this.publishThread(
      userId,
      accessToken,
      initialContentId
    );

    // Track the responses
    const responses: PostResponse[] = [
      {
        id: firstPost.id,
        postId: threadId,
        status: 'success',
        releaseURL: permalink,
      },
    ];

    // Handle replies if any
    let lastReplyId = threadId;

    for (const reply of replies) {
      // Create reply content
      const replyContentId = await this.createThreadContent(
        userId,
        accessToken,
        reply,
        lastReplyId
      );

      // Publish the reply
      const { threadId: replyThreadId } = await this.publishThread(
        userId,
        accessToken,
        replyContentId
      );

      // Update the last reply ID for chaining
      lastReplyId = replyThreadId;

      // Add to responses
      responses.push({
        id: reply.id,
        postId: threadId, // Main thread ID
        status: 'success',
        releaseURL: permalink, // Main thread URL
      });
    }

    if (postDetails?.[0]?.settings?.active_thread_finisher) {
      try {
        const replyContentId = await this.createThreadContent(
          userId,
          accessToken,
          {
            id: makeId(10),
            media: [],
            message: postDetails?.[0]?.settings?.thread_finisher,
            settings: {},
          },
          lastReplyId,
          threadId
        );

        await this.publishThread(userId, accessToken, replyContentId);
      } catch (err) {
        console.log(err);
      }
    }

    return responses;
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
