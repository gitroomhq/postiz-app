import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import dayjs from 'dayjs';
import {
  BadBody,
  SocialAbstract,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { TikTokDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tiktok.dto';
import { timer } from '@gitroom/helpers/utils/timer';
import { Integration } from '@prisma/client';

export class TiktokProvider extends SocialAbstract implements SocialProvider {
  identifier = 'tiktok';
  name = 'Tiktok';
  isBetweenSteps = false;
  scopes = [
    'user.info.basic',
    'video.publish',
    'video.upload',
    'user.info.profile',
  ];

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const value = {
      client_key: process.env.TIKTOK_CLIENT_ID!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    };

    const { access_token, refresh_token, ...all } = await (
      await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        body: new URLSearchParams(value).toString(),
      })
    ).json();

    const {
      data: {
        user: { avatar_url, display_name, open_id, username },
      },
    } = await (
      await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,union_id,username',
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
      username: username,
    };
  }

  async generateAuthUrl() {
    const state = Math.random().toString(36).substring(2);

    return {
      url:
        'https://www.tiktok.com/v2/auth/authorize/' +
        `?client_key=${process.env.TIKTOK_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(
          `${
            process?.env?.FRONTEND_URL?.indexOf('https') === -1
              ? 'https://redirectmeto.com/'
              : ''
          }${process?.env?.FRONTEND_URL}/integrations/social/tiktok`
        )}` +
        `&state=${state}` +
        `&response_type=code` +
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
    const value = {
      client_key: process.env.TIKTOK_CLIENT_ID!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code: params.code,
      grant_type: 'authorization_code',
      code_verifier: params.codeVerifier,
      redirect_uri: `${
            process?.env?.FRONTEND_URL?.indexOf('https') === -1
              ? 'https://redirectmeto.com/'
              : ''
          }${process?.env?.FRONTEND_URL}/integrations/social/tiktok`
    };

    const { access_token, refresh_token, scope } = await (
      await this.fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        body: new URLSearchParams(value).toString(),
      })
    ).json();

    console.log(this.scopes, scope);
    this.checkScopes(this.scopes, scope);

    const {
      data: {
        user: { avatar_url, display_name, open_id, username },
      },
    } = await (
      await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,union_id,username',
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
      username: username,
    };
  }

  async maxVideoLength(accessToken: string) {
    const {
      data: { max_video_post_duration_sec },
    } = await (
      await this.fetch(
        'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
    ).json();

    return {
      maxDurationSeconds: max_video_post_duration_sec,
    };
  }

  private async uploadedVideoSuccess(
    id: string,
    publishId: string,
    accessToken: string
  ): Promise<{ url: string; id: number }> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const post = await (
        await this.fetch(
          'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=UTF-8',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              publish_id: publishId,
            }),
          }
        )
      ).json();

      const { status, publicaly_available_post_id } = post.data;

      if (status === 'PUBLISH_COMPLETE') {
        return {
          url: !publicaly_available_post_id
            ? `https://www.tiktok.com/@${id}`
            : `https://www.tiktok.com/@${id}/video/` +
              publicaly_available_post_id,
          id: !publicaly_available_post_id
            ? publishId
            : publicaly_available_post_id?.[0],
        };
      }

      if (status === 'FAILED') {
        throw new BadBody('titok-error-upload', JSON.stringify(post), {
          // @ts-ignore
          postDetails,
        });
      }

      await timer(3000);
    }
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<TikTokDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [firstPost, ...comments] = postDetails;

    const {
      data: { publish_id },
    } = await (
      await this.fetch(
        'https://open.tiktokapis.com/v2/post/publish/video/init/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            post_info: {
              title: firstPost.message,
              privacy_level: firstPost.settings.privacy_level,
              disable_duet: !firstPost.settings.duet,
              disable_comment: !firstPost.settings.comment,
              disable_stitch: !firstPost.settings.stitch,
              brand_content_toggle: firstPost.settings.brand_content_toggle,
              brand_organic_toggle: firstPost.settings.brand_organic_toggle,
            },
            source_info: {
              source: 'PULL_FROM_URL',
              video_url: firstPost?.media?.[0]?.url!,
            },
          }),
        }
      )
    ).json();

    const { url, id: videoId } = await this.uploadedVideoSuccess(
      integration.profile!,
      publish_id,
      accessToken
    );

    return [
      {
        id: firstPost.id,
        releaseURL: url,
        postId: String(videoId),
        status: 'success',
      },
    ];
  }
}
