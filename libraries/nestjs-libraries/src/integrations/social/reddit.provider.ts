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

export class RedditProvider extends SocialAbstract implements SocialProvider {
  identifier = 'reddit';
  name = 'Reddit';
  isBetweenSteps = false;
  scopes = ['read', 'identity', 'submit', 'flair'];

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
      picture: icon_img.split('?')[0],
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
      scope
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
      picture: icon_img.split('?')[0],
      username: name,
    };
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
            ? 'image'
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
              url: `${
                firstPostSettings.value.media[0].path.indexOf('http') === -1
                  ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/${process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY}`
                  : ``
              }${firstPostSettings.value.media[0].path}`,
            }
          : {}),
        text: post.message,
        sr: firstPostSettings.value.subreddit,
      };

      const {
        json: {
          data: { id, name, url },
        },
      } = await (
        await this.fetch('https://oauth.reddit.com/api/submit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(postData),
        })
      ).json();

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

        // console.log(JSON.stringify(allTop, null, 2), JSON.stringify(allJson, null, 2), JSON.stringify(allData, null, 2));

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
        }
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

    // if (submissionType === 'any' || allow_images) {
    //   permissions.push('media');
    // }

    return permissions;
  }

  async restrictions(accessToken: string, data: { subreddit: string }) {
    const {
      data: { submission_type, allow_images },
    } = await (
      await this.fetch(`https://oauth.reddit.com/${data.subreddit}/about`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
    ).json();

    const { is_flair_required } = await (
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
        }
      )
    ).json();

    const newData = await (
      await this.fetch(
        `https://oauth.reddit.com/${data.subreddit}/api/link_flair_v2`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )
    ).json();

    return {
      subreddit: data.subreddit,
      allow: this.getPermissions(submission_type, allow_images),
      is_flair_required,
      flairs:
        newData?.map?.((p: any) => ({
          id: p.id,
          name: p.text,
        })) || [],
    };
  }
}
