import {
  AnalyticsData,
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import axios from 'axios';
import FormData from 'form-data';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { DribbbleDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/dribbble.dto';
import mime from 'mime-types';
import { DiscordDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/discord.dto';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';

export class DribbbleProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 3; // Dribbble has moderate API limits
  identifier = 'dribbble';
  name = 'Dribbble';
  isBetweenSteps = false;
  scopes = ['public', 'upload'];
  editor = 'normal' as const;
  maxLength() {
    return 40000;
  }
  dto = DribbbleDto;

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const { access_token, expires_in } = await (
      await this.fetch('https://api-sandbox.pinterest.com/v5/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          scope: `${this.scopes.join(',')}`,
          redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/pinterest`,
        }),
      })
    ).json();

    const { id, profile_image, username } = await (
      await this.fetch('https://api-sandbox.pinterest.com/v5/user_account', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
    ).json();

    return {
      id: id,
      name: username,
      accessToken: access_token,
      refreshToken: refreshToken,
      expiresIn: expires_in,
      picture: profile_image || '',
      username,
    };
  }

  @Tool({ description: 'Teams list', dataSchema: [] })
  async teams(accessToken: string) {
    const { teams } = await (
      await this.fetch('https://api.dribbble.com/v2/user', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return (
      teams?.map((team: any) => ({
        id: team.id,
        name: team.name,
      })) || []
    );
  }

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url: `https://dribbble.com/oauth/authorize?client_id=${
        process.env.DRIBBBLE_CLIENT_ID
      }&redirect_uri=${encodeURIComponent(
        `${process.env.FRONTEND_URL}/integrations/social/dribbble`
      )}&response_type=code&scope=${this.scopes.join('+')}&state=${state}`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh: string;
  }) {
    const { access_token, scope } = await (
      await this.fetch(
        `https://dribbble.com/oauth/token?client_id=${process.env.DRIBBBLE_CLIENT_ID}&client_secret=${process.env.DRIBBBLE_CLIENT_SECRET}&code=${params.code}&redirect_uri=${process.env.FRONTEND_URL}/integrations/social/dribbble`,
        {
          method: 'POST',
        }
      )
    ).json();

    this.checkScopes(this.scopes, scope);

    const { id, name, avatar_url, login } = await (
      await this.fetch('https://api.dribbble.com/v2/user', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
    ).json();

    return {
      id: id,
      name,
      accessToken: access_token,
      refreshToken: '',
      expiresIn: 999999999,
      picture: avatar_url,
      username: login,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<DribbbleDto>[]
  ): Promise<PostResponse[]> {
    const { data, status } = await axios.get(
      postDetails?.[0]?.media?.[0]?.path!,
      {
        responseType: 'stream',
      }
    );

    const slash = postDetails?.[0]?.media?.[0]?.path.split('/').at(-1);

    const formData = new FormData();
    formData.append('image', data, {
      filename: slash,
      contentType: mime.lookup(slash!) || '',
    });

    formData.append('title', postDetails[0].settings.title);
    formData.append('description', postDetails[0].message);

    const data2 = await axios.post(
      'https://api.dribbble.com/v2/shots',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const location = data2.headers['location'];
    const newId = location.split('/').at(-1);

    return [
      {
        id: postDetails?.[0]?.id,
        status: 'completed',
        postId: newId,
        releaseURL: `https://dribbble.com/shots/${newId}`,
      },
    ];
  }

  analytics(
    id: string,
    accessToken: string,
    date: number
  ): Promise<AnalyticsData[]> {
    return Promise.resolve([]);
  }
}
