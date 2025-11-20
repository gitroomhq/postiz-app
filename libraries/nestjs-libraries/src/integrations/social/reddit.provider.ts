import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { RedditSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/reddit.dto';
import { timer } from '@gitroom/helpers/utils/timer';
import { groupBy } from 'lodash';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { lookup } from 'mime-types';
import axios from 'axios';
import WebSocket from 'ws';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';

// @ts-ignore
global.WebSocket = WebSocket;

export class RedditProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 1; // Reddit has strict rate limits (1 request per second)
  identifier = 'reddit';
  name = 'Reddit';
  isBetweenSteps = false;
  scopes = ['read', 'identity', 'submit', 'flair'];
  editor = 'normal' as const;
  dto = RedditSettingsDto;

  maxLength() {
    return 10000;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: expiresIn,
    } = await (
      await this.fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      })
    ).json();

    const { name, id, icon_img } = await (
      await this.fetch('https://oauth.reddit.com/api/v1/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return {
      id,
      name,
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
      picture: icon_img?.split?.('?')?.[0] || '',
      username: name,
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    const codeVerifier = makeId(30);
    const url = `https://www.reddit.com/api/v1/authorize?client_id=${
      process.env.REDDIT_CLIENT_ID
    }&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(
      `${process.env.FRONTEND_URL}/integrations/social/reddit`
    )}&duration=permanent&scope=${encodeURIComponent(this.scopes.join(' '))}`;
    return {
      url,
      codeVerifier,
      state,
    };
  }

  async authenticate(params: { code: string; codeVerifier: string }) {
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      scope,
    } = await (
      await this.fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: params.code,
          redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/reddit`,
        }),
      })
    ).json();

    this.checkScopes(this.scopes, scope);

    const { name, id, icon_img } = await (
      await this.fetch('https://oauth.reddit.com/api/v1/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return {
      id,
      name,
      accessToken,
      refreshToken,
      expiresIn,
      picture: icon_img?.split?.('?')?.[0] || '',
      username: name,
    };
  }

  private async uploadFileToReddit(accessToken: string, path: string) {
    const mimeType = lookup(path);
    const formData = new FormData();
    formData.append('filepath', path.split('/').pop());
    formData.append('mimetype', mimeType || 'application/octet-stream');

    const {
      args: { action, fields },
    } = await (
      await this.fetch(
        'https://oauth.reddit.com/api/media/asset',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        },
        'reddit',
        0,
        true
      )
    ).json();

    const { data } = await axios.get(path, {
      responseType: 'arraybuffer',
    });

    const upload = (fields as { name: string; value: string }[]).reduce(
      (acc, value) => {
        acc.append(value.name, value.value);
        return acc;
      },
      new FormData()
    );

    upload.append(
      'file',
      new Blob([Buffer.from(data)], { type: mimeType as string })
    );

    const d = await fetch('https:' + action, {
      method: 'POST',
      body: upload,
    });

    return [...(await d.text()).matchAll(/<Location>(.*?)<\/Location>/g)][0][1];
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<RedditSettingsDto>[]
  ): Promise<PostResponse[]> {
    const [post, ...rest] = postDetails;

    const valueArray: PostResponse[] = [];
    for (const firstPostSettings of post.settings.subreddit) {
      const postData = {
        api_type: 'json',
        title: firstPostSettings.value.title || '',
        kind:
          firstPostSettings.value.type === 'media'
            ? post.media[0].path.indexOf('mp4') > -1
              ? 'video'
              : 'image'
            : firstPostSettings.value.type,
        ...(firstPostSettings.value.flair
          ? { flair_id: firstPostSettings.value.flair.id }
          : {}),
        ...(firstPostSettings.value.type === 'link'
          ? {
              url: firstPostSettings.value.url,
            }
          : {}),
        ...(firstPostSettings.value.type === 'media'
          ? {
              url: await this.uploadFileToReddit(
                accessToken,
                post.media[0].path
              ),
              ...(post.media[0].path.indexOf('mp4') > -1
                ? {
                    video_poster_url: await this.uploadFileToReddit(
                      accessToken,
                      post.media[0].thumbnail
                    ),
                  }
                : {}),
            }
          : {}),
        text: post.message,
        sr: firstPostSettings.value.subreddit,
      };

      const all = await (
        await this.fetch('https://oauth.reddit.com/api/submit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(postData),
        })
      ).json();

      const { id, name, url } = await new Promise<{
        id: string;
        name: string;
        url: string;
      }>((res) => {
        if (all?.json?.data?.id) {
          res(all.json.data);
        }

        const ws = new WebSocket(all.json.data.websocket_url);
        ws.on('message', (data: any) => {
          setTimeout(() => {
            res({ id: '', name: '', url: '' });
            ws.close();
          }, 30_000);
          try {
            const parsedData = JSON.parse(data.toString());
            if (parsedData?.payload?.redirect) {
              const onlyId = parsedData?.payload?.redirect.replace(
                /https:\/\/www\.reddit\.com\/r\/.*?\/comments\/(.*?)\/.*/g,
                '$1'
              );
              res({
                id: onlyId,
                name: `t3_${onlyId}`,
                url: parsedData?.payload?.redirect,
              });
            }
          } catch (err) {}
        });
      });

      valueArray.push({
        postId: id,
        releaseURL: url,
        id: post.id,
        status: 'published',
      });

      for (const comment of rest) {
        const {
          json: {
            data: {
              things: [
                {
                  data: { id: commentId, permalink },
                },
              ],
            },
          },
        } = await (
          await this.fetch('https://oauth.reddit.com/api/comment', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              text: comment.message,
              thing_id: name,
              api_type: 'json',
            }),
          })
        ).json();

        valueArray.push({
          postId: commentId,
          releaseURL: 'https://www.reddit.com' + permalink,
          id: comment.id,
          status: 'published',
        });

        if (rest.length > 1) {
          await timer(5000);
        }
      }

      if (post.settings.subreddit.length > 1) {
        await timer(5000);
      }
    }

    return Object.values(groupBy(valueArray, (p) => p.id)).map((p) => ({
      id: p[0].id,
      postId: p.map((p) => p.postId).join(','),
      releaseURL: p.map((p) => p.releaseURL).join(','),
      status: 'published',
    }));
  }

  @Tool({
    description: 'Get list of subreddits with information',
    dataSchema: [
      {
        key: 'word',
        type: 'string',
        description: 'Search subreddit by string',
      },
    ],
  })
  async subreddits(accessToken: string, data: any) {
    const {
      data: { children },
    } = await (
      await this.fetch(
        `https://oauth.reddit.com/subreddits/search?show=public&q=${data.word}&sort=activity&show_users=false&limit=10`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
        'reddit',
        0,
        false
      )
    ).json();

    return children
      .filter(
        ({ data }: { data: any }) =>
          data.subreddit_type === 'public' && data.submission_type !== 'image'
      )
      .map(({ data: { title, url, id } }: any) => ({
        title,
        name: url,
        id,
      }));
  }

  private getPermissions(submissionType: string, allow_images: string) {
    const permissions = [];
    if (['any', 'self'].indexOf(submissionType) > -1) {
      permissions.push('self');
    }

    if (['any', 'link'].indexOf(submissionType) > -1) {
      permissions.push('link');
    }

    if (allow_images) {
      permissions.push('media');
    }

    return permissions;
  }

  @Tool({
    description: 'Get list of flairs and restrictions for a subreddit',
    dataSchema: [
      {
        key: 'subreddit',
        type: 'string',
        description: 'Search flairs and restrictions by subreddit key should be "/r/[name]"',
      },
    ],
  })
  async restrictions(accessToken: string, data: { subreddit: string }) {
    const {
      data: { submission_type, allow_images, ...all2 },
    } = await (
      await this.fetch(
        `https://oauth.reddit.com/${data.subreddit}/about`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
        'reddit',
        0,
        false
      )
    ).json();

    const { is_flair_required, ...all } = await (
      await this.fetch(
        `https://oauth.reddit.com/api/v1/${
          data.subreddit.split('/r/')[1]
        }/post_requirements`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
        'reddit',
        0,
        false
      )
    ).json();

    // eslint-disable-next-line no-async-promise-executor
    const newData = await new Promise<{ id: string; name: string }[]>(
      async (res) => {
        try {
          const flair = await (
            await this.fetch(
              `https://oauth.reddit.com/${data.subreddit}/api/link_flair_v2`,
              {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
              },
              'reddit',
              0,
              false
            )
          ).json();

          res(flair);
        } catch (err) {
          return res([]);
        }
      }
    );

    return {
      subreddit: data.subreddit,
      allow: this.getPermissions(submission_type, allow_images),
      is_flair_required: is_flair_required && newData.length > 0,
      flairs:
        newData?.map?.((p: any) => ({
          id: p.id,
          name: p.text,
        })) || [],
    };
  }
}
