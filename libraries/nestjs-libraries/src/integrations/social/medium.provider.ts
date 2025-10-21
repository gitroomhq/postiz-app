import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { MediumSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/medium.settings.dto';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';

export class MediumProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 3; // Medium has lenient publishing limits
  identifier = 'medium';
  name = 'Medium';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'markdown' as const;
  dto = MediumSettingsDto;
  maxLength() {
    return 100000;
  }

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url: '',
      codeVerifier: makeId(10),
      state,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
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

  async customFields() {
    return [
      {
        key: 'apiKey',
        label: 'API key',
        validation: `/^.{3,}$/`,
        type: 'password' as const,
      },
    ];
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const body = JSON.parse(Buffer.from(params.code, 'base64').toString());
    try {
      const {
        data: { name, id, imageUrl, username },
      } = await (
        await fetch('https://api.medium.com/v1/me', {
          headers: {
            Authorization: `Bearer ${body.apiKey}`,
          },
        })
      ).json();

      return {
        refreshToken: '',
        expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
        accessToken: body.apiKey,
        id,
        name,
        picture: imageUrl || '',
        username,
      };
    } catch (err) {
      return 'Invalid credentials';
    }
  }

  @Tool({ description: 'List of publications', dataSchema: [] })
  async publications(accessToken: string, _: any, id: string) {
    const { data } = await (
      await fetch(`https://api.medium.com/v1/users/${id}/publications`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return data;
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const { settings } = postDetails?.[0] || { settings: {} };
    const { data } = await (
      await fetch(
        settings?.publication
          ? `https://api.medium.com/v1/publications/${settings?.publication}/posts`
          : `https://api.medium.com/v1/users/${id}/posts`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: settings.title,
            contentFormat: 'markdown',
            content: postDetails?.[0].message,
            ...(settings.canonical ? { canonicalUrl: settings.canonical } : {}),
            ...(settings?.tags?.length
              ? { tags: settings?.tags?.map((p: any) => p.value) }
              : {}),
            publishStatus: settings?.publication ? 'draft' : 'public',
          }),
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )
    ).json();

    return [
      {
        id: postDetails?.[0].id,
        status: 'completed',
        postId: data.id,
        releaseURL: data.url,
      },
    ];
  }
}
