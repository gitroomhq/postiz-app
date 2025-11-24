import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { tags } from '@gitroom/nestjs-libraries/integrations/social/hashnode.tags';
import { jsonToGraphQLQuery } from 'json-to-graphql-query';
import { HashnodeSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/hashnode.settings.dto';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';

export class HashnodeProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 3; // Hashnode has lenient publishing limits
  identifier = 'hashnode';
  name = 'Hashnode';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'markdown' as const;
  maxLength() {
    return 10000;
  }
  dto = HashnodeSettingsDto;

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
        data: {
          me: { name, id, profilePicture, username },
        },
      } = await (
        await fetch('https://gql.hashnode.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `${body.apiKey}`,
          },
          body: JSON.stringify({
            query: `
                    query {
                      me {
                        name,
                        id,
                        profilePicture
                        username
                      }
                    }
                `,
          }),
        })
      ).json();

      return {
        refreshToken: '',
        expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
        accessToken: body.apiKey,
        id,
        name,
        picture: profilePicture || '',
        username,
      };
    } catch (err) {
      return 'Invalid credentials';
    }
  }

  async tags() {
    return tags.map((tag) => ({ value: tag.objectID, label: tag.name }));
  }

  @Tool({ description: 'Tags', dataSchema: [] })
  tagsList() {
    return tags;
  }

  @Tool({ description: 'Publications', dataSchema: [] })
  async publications(accessToken: string) {
    const {
      data: {
        me: {
          publications: { edges },
        },
      },
    } = await (
      await fetch('https://gql.hashnode.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${accessToken}`,
        },
        body: JSON.stringify({
          query: `
            query {
              me {
                publications (first: 50) {
                  edges{
                    node {
                      id
                      title
                    }
                  }
                }
              }
            }
                `,
        }),
      })
    ).json();

    return edges.map(
      ({ node: { id, title } }: { node: { id: string; title: string } }) => ({
        id,
        name: title,
      })
    );
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const { settings } = postDetails?.[0] || { settings: {} };
    const query = jsonToGraphQLQuery(
      {
        mutation: {
          publishPost: {
            __args: {
              input: {
                title: settings.title,
                publicationId: settings.publication,
                ...(settings.canonical
                  ? { originalArticleURL: settings.canonical }
                  : {}),
                contentMarkdown: postDetails?.[0].message,
                tags: settings.tags.map((tag: any) => ({ id: tag.value })),
                ...(settings.subtitle ? { subtitle: settings.subtitle } : {}),
                ...(settings.main_image
                  ? {
                      coverImageOptions: {
                        coverImageURL: `${
                          settings?.main_image?.path?.indexOf('http') === -1
                            ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/${process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY}`
                            : ``
                        }${settings?.main_image?.path}`,
                      },
                    }
                  : {}),
              },
            },
            post: {
              id: true,
              url: true,
            },
          },
        },
      },
      { pretty: true }
    );

    const {
      data: {
        publishPost: {
          post: { id: postId, url },
        },
      },
    } = await (
      await this.fetch('https://gql.hashnode.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${accessToken}`,
        },
        body: JSON.stringify({
          query,
        }),
      })
    ).json();

    return [
      {
        id: postDetails?.[0].id,
        status: 'completed',
        postId: postId,
        releaseURL: url,
      },
    ];
  }
}
