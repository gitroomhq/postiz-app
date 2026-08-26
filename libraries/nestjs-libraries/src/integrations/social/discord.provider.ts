import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';
import { DiscordDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/discord.dto';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';
import FormDataUpload from 'form-data';

export class DiscordProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 5; // Discord has generous rate limits for webhook posting
  identifier = 'discord';
  name = 'Discord';
  isBetweenSteps = false;
  editor = 'markdown' as const;
  scopes = ['identify', 'guilds'];
  maxLength() {
    return 1980;
  }
  dto = DiscordDto;

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const { access_token, expires_in, refresh_token } = await (
      await this.fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            process.env.DISCORD_CLIENT_ID +
              ':' +
              process.env.DISCORD_CLIENT_SECRET
          ).toString('base64')}`,
        },
      })
    ).json();

    const { application } = await (
      await this.fetch('https://discord.com/api/oauth2/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
    ).json();

    return {
      refreshToken: refresh_token,
      expiresIn: expires_in,
      accessToken: access_token,
      id: '',
      name: application.name,
      picture: '',
      username: '',
    };
  }
  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url: `https://discord.com/oauth2/authorize?client_id=${
        process.env.DISCORD_CLIENT_ID
      }&permissions=377957124096&response_type=code&redirect_uri=${encodeURIComponent(
        `${process.env.FRONTEND_URL}/integrations/social/discord`
      )}&integration_type=0&scope=bot+identify+guilds&state=${state}`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const { access_token, expires_in, refresh_token, scope, guild } = await (
      await this.fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
          code: params.code,
          grant_type: 'authorization_code',
          redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/discord`,
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            process.env.DISCORD_CLIENT_ID +
              ':' +
              process.env.DISCORD_CLIENT_SECRET
          ).toString('base64')}`,
        },
      })
    ).json();

    this.checkScopes(this.scopes, scope.split(' '));

    const { application } = await (
      await this.fetch('https://discord.com/api/oauth2/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
    ).json();

    return {
      id: guild.id,
      name: application.name,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      picture: `https://cdn.discordapp.com/avatars/${application.bot.id}/${application.bot.avatar}.png`,
      username: application.bot.username,
    };
  }

  @Tool({ description: 'Channels', dataSchema: [] })
  async channels(accessToken: string, params: any, id: string) {
    const list = await (
      await this.fetch(`https://discord.com/api/guilds/${id}/channels`, {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
        },
      })
    ).json();

    return list
      .filter((p: any) => p.type === 0 || p.type === 5 || p.type === 15)
      .map((p: any) => ({
        id: String(p.id),
        name: p.name,
      }));
  }

  // Builds the multipart message and streams each attachment straight from its
  // source (size from a HEAD request) so files are never buffered in memory.
  // runStreamedUpload rebuilds the whole form per attempt (a consumed stream
  // can't be replayed) and keeps handleErrors classification.
  private async sendMessageWithMedia(
    channel: string,
    message: string,
    media: PostDetails['media']
  ) {
    return this.runStreamedUpload(async () => {
      const form = new FormDataUpload();
      form.append(
        'payload_json',
        JSON.stringify({
          content: message.replace(/\[\[\[(@.*?)]]]/g, (match, p1) => {
            return `<${p1}>`;
          }),
          attachments: media?.map((p, index) => ({
            id: index,
            description: `Picture ${index}`,
            filename: p.path.split('/').pop(),
          })),
        })
      );

      let index = 0;
      for (const item of media || []) {
        const fileSize = await this.mediaSize(item.path, this.identifier);
        const stream = await this.mediaStream(item.path, this.identifier);
        form.append(`files[${index}]`, stream, {
          filename: item.path.split('/').pop(),
          knownLength: fileSize,
        });
        index++;
      }

      const { data } = await this.getSsrfSafeAxios().post(
        `https://discord.com/api/channels/${channel}/messages`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
          },
        }
      );

      return data;
    }, this.identifier);
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;
    const channel = firstPost.settings.channel;

    const data = await this.sendMessageWithMedia(
      channel,
      firstPost.message,
      firstPost.media
    );

    return [
      {
        id: firstPost.id,
        releaseURL: `https://discord.com/channels/${id}/${channel}/${data.id}`,
        postId: data.id,
        status: 'success',
      },
    ];
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [commentPost] = postDetails;
    const channel = commentPost.settings.channel;

    // For Discord, we create a thread from the original message for comments
    // If we don't have a thread yet, create one
    let threadChannel = channel;

    // Create thread if this is the first comment
    if (!lastCommentId) {
      const { id: threadId } = await (
        await this.fetch(
          `https://discord.com/api/channels/${channel}/messages/${postId}/threads`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'Thread',
              auto_archive_duration: 1440,
            }),
          }
        )
      ).json();
      threadChannel = threadId;
    }

    const data = await this.sendMessageWithMedia(
      threadChannel,
      commentPost.message,
      commentPost.media
    );

    return [
      {
        id: commentPost.id,
        releaseURL: `https://discord.com/channels/${id}/${threadChannel}/${data.id}`,
        postId: data.id,
        status: 'success',
      },
    ];
  }

  async changeNickname(id: string, accessToken: string, name: string) {
    await (
      await this.fetch(`https://discord.com/api/guilds/${id}/members/@me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nick: name,
        }),
      })
    ).json();

    return {
      name,
    };
  }

  override async mention(
    token: string,
    data: { query: string },
    id: string,
    integration: Integration
  ) {
    const allRoles = await (
      await this.fetch(`https://discord.com/api/guilds/${id}/roles`, {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
          'Content-Type': 'application/json',
        },
      })
    ).json();

    const matching = allRoles
      .filter((role: any) =>
        role.name.toLowerCase().includes(data.query.toLowerCase())
      )
      .filter((f: any) => f.name !== '@everyone' && f.name !== '@here');

    const list = await (
      await this.fetch(
        `https://discord.com/api/guilds/${id}/members/search?query=${data.query}`,
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_ID}`,
            'Content-Type': 'application/json',
          },
        }
      )
    ).json();

    return [
      ...[
        {
          id: String('here'),
          label: 'here',
          image: '',
          doNotCache: true,
        },
        {
          id: String('everyone'),
          label: 'everyone',
          image: '',
          doNotCache: true,
        },
      ].filter((role: any) => {
        return role.label.toLowerCase().includes(data.query.toLowerCase());
      }),
      ...matching.map((p: any) => ({
        id: String('&' + p.id),
        label: p.name.split('@')[1],
        image: '',
        doNotCache: true,
      })),
      ...list.map((p: any) => ({
        id: String(p.user.id),
        label: p.user.global_name || p.user.username,
        image: `https://cdn.discordapp.com/avatars/${p.user.id}/${p.user.avatar}.png`,
      })),
    ];
  }

  mentionFormat(idOrHandle: string, name: string) {
    if (name === '@here' || name === '@everyone') {
      return name;
    }
    return `[[[@${idOrHandle.replace('@', '')}]]]`;
  }

  override handleErrors(
    body: string
  ):
    | { type: 'refresh-token' | 'bad-body' | 'retry'; value: string }
    | undefined {
    if (body.includes('50001')) {
      return {
        type: 'bad-body',
        value: "Bot doesn't have access to this channel",
      };
    }

    if (body.includes('50013')) {
      return {
        type: 'bad-body',
        value: 'Bot lacks permission to send messages in this channel',
      };
    }

    if (body.includes('10003')) {
      return {
        type: 'bad-body',
        value: 'Channel no longer exists',
      };
    }

    if (body.includes('40005')) {
      return {
        type: 'bad-body',
        value: "Attachment exceeds Discord's size limit",
      };
    }

    if (body.includes('20028')) {
      return {
        type: 'retry',
        value: 'Rate limited by Discord',
      };
    }

    return undefined;
  }
}
