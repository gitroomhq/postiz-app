import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

export class RedditProvider implements SocialProvider {
  identifier = 'reddit';
  name = 'Reddit';
  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: expiresIn,
    } = await (
      await fetch('https://www.reddit.com/api/v1/access_token', {
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
      await fetch('https://oauth.reddit.com/api/v1/me', {
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
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    const codeVerifier = makeId(30);
    const url = `https://www.reddit.com/api/v1/authorize?client_id=${
      process.env.REDDIT_CLIENT_ID
    }&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(
      `${process.env.FRONTEND_URL}/integrations/social/reddit`
    )}&duration=permanent&scope=${encodeURIComponent(
      'read identity submit flair'
    )}`;
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
    } = await (
      await fetch('https://www.reddit.com/api/v1/access_token', {
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

    const { name, id, icon_img } = await (
      await fetch('https://oauth.reddit.com/api/v1/me', {
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
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [post, ...rest] = postDetails;
    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        title: 'test',
        kind: 'self',
        text: post.message,
        sr: '/r/gitroom',
      }),
    });

    return [];
  }

  async subreddits(accessToken: string, data: any) {
    const {
      data: { children },
    } = await (
      await fetch(
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

    console.log(children);
    return children.filter(({data} : {data: any}) => data.subreddit_type === "public").map(({ data: { title, url, id } }: any) => ({
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

    if (submissionType === "any" || allow_images) {
      permissions.push('media');
    }

    return permissions;
  }

  async restrictions(accessToken: string, data: { subreddit: string }) {
    const {
      data: { submission_type, allow_images },
    } = await (
      await fetch(`https://oauth.reddit.com/${data.subreddit}/about`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
    ).json();

    const {
      is_flair_required,
    } = await (
      await fetch(`https://oauth.reddit.com/api/v1/${data.subreddit.split('/r/')[1]}/post_requirements`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
    ).json();

    const newData = await (
      await fetch(`https://oauth.reddit.com/${data.subreddit}/api/link_flair_v2`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
    ).json();

    return {
      subreddit: data.subreddit,
      allow: this.getPermissions(submission_type, allow_images),
      is_flair_required,
      flairs: newData?.map?.((p: any) => ({
        id: p.id,
        name: p.text
      })) || []
    }
  }
}
