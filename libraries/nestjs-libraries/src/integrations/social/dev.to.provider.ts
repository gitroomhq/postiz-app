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
import { DevToSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/dev.to.settings.dto';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';

export class DevToProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 3; // Dev.to has moderate publishing limits
  identifier = 'devto';
  name = 'Dev.to';
  isBetweenSteps = false;
  editor = 'markdown' as const;
  scopes = [] as string[];
  maxLength() {
    return 100000;
  }
  dto = DevToSettingsDto;

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url: '',
      codeVerifier: makeId(10),
      state,
    };
  }

  override handleErrors(body: string) {
    if (body.indexOf('Canonical url has already been taken') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Canonical URL already exists',
      };
    }

    return undefined;
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
      const { name, id, profile_image, username } = await (
        await fetch('https://dev.to/api/users/me', {
          headers: {
            'api-key': body.apiKey,
          },
        })
      ).json();

      return {
        refreshToken: '',
        expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
        accessToken: body.apiKey,
        id,
        name,
        picture: profile_image || '',
        username,
      };
    } catch (err) {
      return 'Invalid credentials';
    }
  }

  @Tool({ description: 'Tag list', dataSchema: [] })
  async tags(token: string) {
    const tags = await (
      await fetch('https://dev.to/api/tags?per_page=1000&page=1', {
        headers: {
          'api-key': token,
        },
      })
    ).json();

    return tags.map((p: any) => ({ value: p.id, label: p.name }));
  }

  @Tool({ description: 'Organization list', dataSchema: [] })
  async organizations(token: string) {
    const orgs = await (
      await fetch('https://dev.to/api/articles/me/all?per_page=1000', {
        headers: {
          'api-key': token,
        },
      })
    ).json();

    const allOrgs: string[] = [
      ...new Set(
        orgs
          .flatMap((org: any) => org?.organization?.username)
          .filter((f: string) => f)
      ),
    ] as string[];
    const fullDetails = await Promise.all(
      allOrgs.map(async (org: string) => {
        return (
          await fetch(`https://dev.to/api/organizations/${org}`, {
            headers: {
              'api-key': token,
            },
          })
        ).json();
      })
    );

    return fullDetails.map((org: any) => ({
      id: org.id,
      name: org.name,
      username: org.username,
    }));
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const { settings } = postDetails?.[0] || { settings: {} };
    const { id: postId, url } = await (
      await this.fetch(`https://dev.to/api/articles`, {
        method: 'POST',
        body: JSON.stringify({
          article: {
            title: settings.title,
            body_markdown: postDetails?.[0].message,
            published: true,
            ...(settings?.main_image?.path
              ? { main_image: settings?.main_image?.path }
              : {}),
            tags: settings?.tags?.map((t: any) => t.label),
            organization_id: settings.organization,
            ...(settings.canonical
              ? { canonical_url: settings.canonical }
              : {}),
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'api-key': accessToken,
        },
      })
    ).json();

    return [
      {
        id: postDetails?.[0].id,
        status: 'completed',
        postId: String(postId),
        releaseURL: url,
      },
    ];
  }
}
