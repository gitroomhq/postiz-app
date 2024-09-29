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

export class ThreadsProvider extends SocialAbstract implements SocialProvider {
  identifier = 'threads';
  name = 'Threads';
  isBetweenSteps = false;
  scopes = [
    'threads_basic',
    'threads_content_publish',
    'threads_manage_replies',
    'threads_manage_insights',
  ];

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
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

  async generateAuthUrl(refresh?: string) {
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

  private async checkLoaded(
    mediaContainerId: string,
    accessToken: string
  ): Promise<boolean> {
    const { status, id, error_message } = await (
      await this.fetch(
        `https://graph.threads.net/v1.0/${mediaContainerId}?fields=status,error_message&access_token=${accessToken}`
      )
    ).json();
    console.log(status, error_message);
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

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [firstPost, ...theRest] = postDetails;

    let globalThread = '';
    let link = '';

    if (firstPost?.media?.length! <= 1) {
      const type = !firstPost?.media?.[0]?.path
        ? undefined
        : firstPost?.media![0].path.indexOf('.mp4') > -1
        ? 'video_url'
        : 'image_url';

      const media = new URLSearchParams({
        ...(type === 'video_url'
          ? { video_url: firstPost?.media![0].path }
          : {}),
        ...(type === 'image_url'
          ? { image_url: firstPost?.media![0].path }
          : {}),
        media_type:
          type === 'video_url'
            ? 'VIDEO'
            : type === 'image_url'
            ? 'IMAGE'
            : 'TEXT',
        text: firstPost?.message,
        access_token: accessToken,
      });

      const { id: containerId } = await (
        await this.fetch(
          `https://graph.threads.net/v1.0/${id}/threads?${media.toString()}`,
          {
            method: 'POST',
          }
        )
      ).json();

      await this.checkLoaded(containerId, accessToken);

      const { id: threadId } = await (
        await this.fetch(
          `https://graph.threads.net/v1.0/${id}/threads_publish?creation_id=${containerId}&access_token=${accessToken}`,
          {
            method: 'POST',
          }
        )
      ).json();

      const { permalink, ...all } = await (
        await this.fetch(
          `https://graph.threads.net/v1.0/${threadId}?fields=id,permalink&access_token=${accessToken}`
        )
      ).json();

      globalThread = threadId;
      link = permalink;
    } else {
      const medias = [];
      for (const mediaLoad of firstPost.media!) {
        const type =
          mediaLoad.path.indexOf('.mp4') > -1 ? 'video_url' : 'image_url';

        const media = new URLSearchParams({
          ...(type === 'video_url' ? { video_url: mediaLoad.path } : {}),
          ...(type === 'image_url' ? { image_url: mediaLoad.path } : {}),
          is_carousel_item: 'true',
          media_type:
            type === 'video_url'
              ? 'VIDEO'
              : type === 'image_url'
              ? 'IMAGE'
              : 'TEXT',
          text: firstPost?.message,
          access_token: accessToken,
        });

        const { id: mediaId } = await (
          await this.fetch(
            `https://graph.threads.net/v1.0/${id}/threads?${media.toString()}`,
            {
              method: 'POST',
            }
          )
        ).json();

        medias.push(mediaId);
      }

      await Promise.all(
        medias.map((p: string) => this.checkLoaded(p, accessToken))
      );

      const { id: containerId } = await (
        await this.fetch(
          `https://graph.threads.net/v1.0/${id}/threads?text=${
            firstPost?.message
          }&media_type=CAROUSEL&children=${medias.join(
            ','
          )}&access_token=${accessToken}`,
          {
            method: 'POST',
          }
        )
      ).json();

      await this.checkLoaded(containerId, accessToken);

      const { id: threadId } = await (
        await this.fetch(
          `https://graph.threads.net/v1.0/${id}/threads_publish?creation_id=${containerId}&access_token=${accessToken}`,
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

      globalThread = threadId;
      link = permalink;
    }

    let lastId = globalThread;
    for (const post of theRest) {
      const form = new FormData();
      form.append('media_type', 'TEXT');
      form.append('text', post.message);
      form.append('reply_to_id', lastId);
      form.append('access_token', accessToken);

      const { id: replyId } = await (
        await this.fetch('https://graph.threads.net/v1.0/me/threads', {
          method: 'POST',
          body: form,
        })
      ).json();

      const { id: threadMediaId } = await (
        await this.fetch(
          `https://graph.threads.net/v1.0/${id}/threads_publish?creation_id=${replyId}&access_token=${accessToken}`,
          {
            method: 'POST',
          }
        )
      ).json();

      lastId = threadMediaId;
    }

    return [
      {
        id: firstPost.id,
        postId: String(globalThread),
        status: 'success',
        releaseURL: link,
      },
      ...theRest.map((p) => ({
        id: p.id,
        postId: String(globalThread),
        status: 'success',
        releaseURL: link,
      })),
    ];
  }

  async analytics(
    id: string,
    accessToken: string,
    date: number
  ): Promise<AnalyticsData[]> {
    const until = dayjs().format('YYYY-MM-DD');
    const since = dayjs().subtract(date, 'day').format('YYYY-MM-DD');

    const { data, ...all } = await (
      await fetch(
        `https://graph.threads.net/v1.0/${id}/threads_insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}&period=day&since=${since}&until=${until}`
      )
    ).json();

    console.log(data);
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
}
