import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { SlackDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/slack.dto';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';

export class SlackProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 3; // Slack has moderate API limits
  identifier = 'slack';
  name = 'Slack';
  isBetweenSteps = false;
  editor = 'normal' as const;
  scopes = [
    'channels:read',
    'chat:write',
    'users:read',
    'groups:read',
    'channels:join',
    'chat:write.customize',
  ];
  dto = SlackDto;

  maxLength() {
    return 400000;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: '',
      expiresIn: 1000000,
      accessToken: '',
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }
  async generateAuthUrl() {
    const state = makeId(6);

    return {
      url: `https://slack.com/oauth/v2/authorize?client_id=${
        process.env.SLACK_ID
      }&redirect_uri=${encodeURIComponent(
        `${
          process?.env?.FRONTEND_URL?.indexOf('https') === -1
            ? 'https://redirectmeto.com/'
            : ''
        }${process?.env?.FRONTEND_URL}/integrations/social/slack`
      )}&scope=channels:read,chat:write,users:read,groups:read,channels:join,chat:write.customize&state=${state}`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const { access_token, team, bot_user_id, scope } = await (
      await this.fetch(`https://slack.com/api/oauth.v2.access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.SLACK_ID!,
          client_secret: process.env.SLACK_SECRET!,
          code: params.code,
          redirect_uri: `${
            process?.env?.FRONTEND_URL?.indexOf('https') === -1
              ? 'https://redirectmeto.com/'
              : ''
          }${process?.env?.FRONTEND_URL}/integrations/social/slack${
            params.refresh ? `?refresh=${params.refresh}` : ''
          }`,
        }),
      })
    ).json();

    this.checkScopes(this.scopes, scope.split(','));

    const { user } = await (
      await fetch(`https://slack.com/api/users.info?user=${bot_user_id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
    ).json();

    return {
      id: team.id,
      name: user.real_name,
      accessToken: access_token,
      refreshToken: 'null',
      expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
      picture: user?.profile?.image_original || '',
      username: user.name,
    };
  }

  @Tool({
    description: 'Get list of channels',
    dataSchema: [],
  })
  async channels(accessToken: string, params: any, id: string) {
    const list = await (
      await fetch(
        `https://slack.com/api/conversations.list?types=public_channel,private_channel`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
    ).json();

    return list.channels.map((p: any) => ({
      id: p.id,
      name: p.name,
    }));
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    await fetch(`https://slack.com/api/conversations.join`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: postDetails[0].settings.channel,
      }),
    });

    let lastId = '';
    for (const post of postDetails) {
      const { ts } = await (
        await fetch(`https://slack.com/api/chat.postMessage`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: postDetails[0].settings.channel,
            username: integration.name,
            icon_url: integration.picture,
            ...(lastId ? { thread_ts: lastId } : {}),
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: post.message,
                },
              },
              ...(post.media?.length
                ? post.media.map((m) => ({
                    type: 'image',
                    image_url: m.path,
                    alt_text: '',
                  }))
                : []),
            ],
          }),
        })
      ).json();

      lastId = ts;
    }

    return [];
  }

  async changeProfilePicture(id: string, accessToken: string, url: string) {
    return {
      url,
    };
  }

  async changeNickname(id: string, accessToken: string, name: string) {
    return {
      name,
    };
  }
}
