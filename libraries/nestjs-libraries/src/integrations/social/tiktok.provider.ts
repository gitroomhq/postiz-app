import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';

export class TiktokProvider extends SocialAbstract implements SocialProvider {
  identifier = 'tiktok';
  name = 'Tiktok';
  isBetweenSteps = false;

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const value = {
      client_key: process.env.TIKTOK_CLIENT_ID!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      refresh_token: refreshToken,
    };

    const { access_token, refresh_token } = await (
      await this.fetch('https://open.tiktokapis.com/v2/oauth/token/', {
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
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
    ).json();

    return {
      refreshToken: refresh_token,
      expiresIn: dayjs().add(23, 'hours').unix() - dayjs().unix(),
      accessToken: access_token,
      id: open_id.replace(/-/g, ''),
      name: display_name,
      picture: avatar_url,
      username: display_name.toLowerCase(),
    };
  }

  async generateAuthUrl(refresh?: string) {
    const state = Math.random().toString(36).substring(2);

    return {
      url:
        'https://www.tiktok.com/v2/auth/authorize/' +
        `?client_key=${process.env.TIKTOK_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(
          `${
            process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
              ? `https://integration.git.sn/integrations/social/tiktok`
              : `${process.env.FRONTEND_URL}/integrations/social/tiktok`
          }${refresh ? `?refresh=${refresh}` : ''}`
        )}` +
        `&state=${state}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(
          'user.info.basic,video.publish,video.upload'
        )}`,
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
      redirect_uri:
        process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
          ? `https://integration.git.sn/integrations/social/tiktok`
          : `${process.env.FRONTEND_URL}/integrations/social/tiktok`,
    };

    const { access_token, refresh_token } = await (
      await this.fetch('https://open.tiktokapis.com/v2/oauth/token/', {
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
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
    ).json();

    return {
      id: open_id.replace(/-/g, ''),
      name: display_name,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: dayjs().add(23, 'hours').unix() - dayjs().unix(),
      picture: avatar_url,
      username: display_name.toLowerCase(),
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [firstPost, ...comments] = postDetails;

    let finalId = '';
    let finalUrl = '';
    if ((firstPost?.media?.[0]?.path?.indexOf('mp4') || -2) > -1) {
      const { id: videoId, permalink_url } = await (
        await this.fetch(
          `https://graph.facebook.com/v20.0/${id}/videos?access_token=${accessToken}&fields=id,permalink_url`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file_url: firstPost?.media?.[0]?.path!,
              description: firstPost.message,
              published: true,
            }),
          }
        )
      ).json();

      finalUrl = permalink_url;
      finalId = videoId;
    } else {
      const uploadPhotos = !firstPost?.media?.length
        ? []
        : await Promise.all(
            firstPost.media.map(async (media) => {
              const { id: photoId } = await (
                await this.fetch(
                  `https://graph.facebook.com/v20.0/${id}/photos?access_token=${accessToken}`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      url: media.url,
                      published: false,
                    }),
                  }
                )
              ).json();

              return { media_fbid: photoId };
            })
          );

      const {
        id: postId,
        permalink_url,
        ...all
      } = await (
        await this.fetch(
          `https://graph.facebook.com/v20.0/${id}/feed?access_token=${accessToken}&fields=id,permalink_url`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...(uploadPhotos?.length ? { attached_media: uploadPhotos } : {}),
              message: firstPost.message,
              published: true,
            }),
          }
        )
      ).json();

      finalUrl = permalink_url;
      finalId = postId;
    }

    const postsArray = [];
    for (const comment of comments) {
      const data = await (
        await this.fetch(
          `https://graph.facebook.com/v20.0/${finalId}/comments?access_token=${accessToken}&fields=id,permalink_url`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...(comment.media?.length
                ? { attachment_url: comment.media[0].url }
                : {}),
              message: comment.message,
            }),
          }
        )
      ).json();

      postsArray.push({
        id: comment.id,
        postId: data.id,
        releaseURL: data.permalink_url,
        status: 'success',
      });
    }
    return [
      {
        id: firstPost.id,
        postId: finalId,
        releaseURL: finalUrl,
        status: 'success',
      },
      ...postsArray,
    ];
  }
}
