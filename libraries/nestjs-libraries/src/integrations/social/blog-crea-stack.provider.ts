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
import { BlogCreaStackDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/blog-crea-stack.dto';

export class BlogCreaStackProvider
  extends SocialAbstract
  implements SocialProvider
{
  identifier = 'blogcreastack';
  name = 'Blog (CREA Stack)';
  isBetweenSteps = false;
  editor = 'html' as const;
  scopes = [] as string[];
  override maxConcurrentJob = 5;
  dto = BlogCreaStackDto;

  maxLength() {
    return 100000;
  }

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url: state,
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

  override handleErrors(
    body: string
  ):
    | { type: 'refresh-token' | 'bad-body' | 'retry'; value: string }
    | undefined {
    if (body.indexOf('Unauthorized') > -1 || body.indexOf('401') > -1) {
      return {
        type: 'bad-body',
        value: 'Invalid API key for the blog endpoint',
      };
    }
    return undefined;
  }

  async customFields() {
    return [
      {
        key: 'domain',
        label: 'Blog URL',
        validation: `/^https?:\\/\\/(?:www\\.)?[\\w\\-]+(\\.[\\w\\-]+)+([\\/?#][^\\s]*)?$/`,
        type: 'text' as const,
      },
      {
        key: 'apiKey',
        label: 'API Key',
        validation: `/.+/`,
        type: 'password' as const,
      },
    ];
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const body = JSON.parse(Buffer.from(params.code, 'base64').toString()) as {
      domain: string;
      apiKey: string;
    };

    try {
      const response = await fetch(
        `${body.domain.replace(/\/$/, '')}/api/postiz-publish/health`,
        {
          headers: {
            Authorization: `Bearer ${body.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        return 'Invalid credentials';
      }

      const data = (await response.json()) as {
        id?: string;
        name?: string;
        picture?: string;
      };

      return {
        refreshToken: '',
        expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
        accessToken: params.code,
        id: data.id || body.domain,
        name: data.name || body.domain,
        picture: data.picture || '',
        username: body.domain,
      };
    } catch (err) {
      console.log(err);
      return 'Invalid credentials';
    }
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<BlogCreaStackDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const body = JSON.parse(Buffer.from(accessToken, 'base64').toString()) as {
      domain: string;
      apiKey: string;
    };

    const settings = postDetails?.[0]?.settings;
    const message = postDetails?.[0]?.message;

    const response = await this.fetch(
      `${body.domain.replace(/\/$/, '')}/api/postiz-publish`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${body.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: settings?.title,
          slug: settings?.slug,
          content: message,
          excerpt: settings?.excerpt,
          locale: settings?.locale || 'es',
          ...(settings?.featuredImage
            ? { featuredImage: settings.featuredImage }
            : {}),
          ...(settings?.categorySlug
            ? { categorySlug: settings.categorySlug }
            : {}),
          ...(settings?.tags && settings.tags.length > 0
            ? { tags: settings.tags }
            : {}),
          ...(settings?.translationGroupId
            ? { translationGroupId: settings.translationGroupId }
            : {}),
        }),
      }
    );

    const result = (await response.json()) as {
      id: string | number;
      releaseURL: string;
    };

    return [
      {
        id: postDetails[0].id,
        status: 'completed',
        postId: String(result.id),
        releaseURL: result.releaseURL,
      },
    ];
  }
}
