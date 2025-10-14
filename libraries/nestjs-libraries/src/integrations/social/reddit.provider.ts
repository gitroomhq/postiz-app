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

// @ts-ignore
global.WebSocket = WebSocket;

export class RedditProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 1; // Reddit has strict rate limits (1 request per second)
  identifier = 'reddit';
  name = 'Reddit';
  isBetweenSteps = false;
  scopes = ['read', 'identity', 'submit', 'flair'];
  editor = 'normal' as const;

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

  private async uploadFileToReddit(
    accessToken: string,
    path: string
  ): Promise<{ url: string; assetId?: string }> {
    const mimeType = lookup(path);
    const formData = new FormData();
    formData.append('filepath', path.split('/').pop());
    formData.append('mimetype', mimeType || 'application/octet-stream');

    const responseData = await (
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

    const {
      args: { action, fields },
      asset,
    } = responseData;

    const assetId = asset?.asset_id || asset?.id;

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

    const url = [
      ...(await d.text()).matchAll(/<Location>(.*?)<\/Location>/g),
    ][0][1];

    return { url, assetId };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<RedditSettingsDto>[]
  ): Promise<PostResponse[]> {
    const [post, ...rest] = postDetails;

    const valueArray: PostResponse[] = [];
    for (const firstPostSettings of post.settings.subreddit) {
      const hasVideo =
        post.media?.some((m) => m.path.indexOf('mp4') > -1) === true;
      const images = (post.media || []).filter(
        (m) => m.path.indexOf('mp4') === -1
      );

      // Determine post kind based on actual content
      let useGalleryEndpoint = false;
      let kind: string;

      if (hasVideo) {
        kind = 'video';
      } else if (images.length > 1) {
        useGalleryEndpoint = true;
        kind = 'gallery';
      } else if (images.length === 1) {
        kind = 'image';
      } else {
        kind = firstPostSettings.value.type;
      }

      let postData: any = {
        api_type: 'json',
        title: firstPostSettings.value.title || '',
        kind,
        text: post.message,
        sr: firstPostSettings.value.subreddit,
        ...(firstPostSettings.value.flair
          ? { flair_id: firstPostSettings.value.flair.id }
          : {}),
      };

      // Handle different post types
      if (firstPostSettings.value.type === 'link') {
        postData.url = firstPostSettings.value.url;
      } else if (firstPostSettings.value.type === 'media') {
        if (kind === 'video') {
          const videoUpload = await this.uploadFileToReddit(
            accessToken,
            post.media[0].path
          );
          postData.url = videoUpload.url;

          if (post.media[0].thumbnail) {
            const thumbnailUpload = await this.uploadFileToReddit(
              accessToken,
              post.media[0].thumbnail
            );
            postData.video_poster_url = thumbnailUpload.url;
          }
        } else if (!useGalleryEndpoint) {
          const imageUpload = await this.uploadFileToReddit(
            accessToken,
            post.media[0].path
          );
          postData.url = imageUpload.url;
        }
      }

      let all: any;

      if (useGalleryEndpoint && images.length > 1) {
        // Upload all images for gallery
        const uploads: { url: string; assetId?: string }[] = [];
        for (let i = 0; i < images.length; i++) {
          const uploaded = await this.uploadFileToReddit(
            accessToken,
            images[i].path
          );
          uploads.push(uploaded);

          if (i < images.length - 1) {
            await timer(1000);
          }
        }

        const items = uploads
          .filter((u) => u.assetId)
          .map((u) => ({
            media_id: u.assetId,
            caption: '',
            outbound_url: '',
          }));

        if (items.length < 2) {
          // Fallback to single image if insufficient asset IDs
          const firstImageUpload = await this.uploadFileToReddit(
            accessToken,
            images[0].path
          );
          postData = {
            api_type: 'json',
            kind: 'image',
            sr: firstPostSettings.value.subreddit,
            title: firstPostSettings.value.title || '',
            url: firstImageUpload.url,
            ...(firstPostSettings.value.flair
              ? { flair_id: firstPostSettings.value.flair.id }
              : {}),
          };

          all = await (
            await this.fetch('https://oauth.reddit.com/api/submit', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams(postData),
            })
          ).json();
        } else {
          // Submit gallery post
          const galleryBody = {
            sr: firstPostSettings.value.subreddit,
            title: firstPostSettings.value.title || '',
            items,
            api_type: 'json',
            resubmit: true,
            sendreplies: true,
            nsfw: false,
            spoiler: false,
            ...(firstPostSettings.value.flair
              ? { flair_id: firstPostSettings.value.flair.id }
              : {}),
          };

          all = await (
            await this.fetch(
              'https://oauth.reddit.com/api/submit_gallery_post.json?raw_json=1',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(galleryBody),
              }
            )
          ).json();
        }
      } else {
        all = await (
          await this.fetch('https://oauth.reddit.com/api/submit', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(postData),
          })
        ).json();
      }

      const { id, name, url } = await new Promise<{
        id: string;
        name: string;
        url: string;
      }>((res) => {
        if (all?.json?.data?.id) {
          res(all.json.data);
        }

        if (!all?.json?.data?.websocket_url) {
          res({ id: '', name: '', url: '' });
          return;
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
