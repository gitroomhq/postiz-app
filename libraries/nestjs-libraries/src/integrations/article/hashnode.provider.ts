import { ArticleProvider } from '@gitroom/nestjs-libraries/integrations/article/article.integrations.interface';
import { tags } from '@gitroom/nestjs-libraries/integrations/article/hashnode.tags';
import { jsonToGraphQLQuery } from 'json-to-graphql-query';
import { HashnodeSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/hashnode.settings.dto';

export class HashnodeProvider implements ArticleProvider {
  identifier = 'hashnode';
  name = 'Hashnode';
  async authenticate(token: string) {
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
            Authorization: `${token}`,
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
        id,
        name,
        token,
        picture: profilePicture,
        username,
      };
    } catch (err) {
      return {
        id: '',
        name: '',
        token: '',
        picture: '',
        username: '',
      };
    }
  }

  async tags() {
    return tags.map((tag) => ({ value: tag.objectID, label: tag.name }));
  }

  async publications(token: string) {
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
          Authorization: `${token}`,
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

  async post(token: string, content: string, settings: HashnodeSettingsDto) {
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
                contentMarkdown: content,
                tags: settings.tags.map((tag) => ({ id: tag.value })),
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
          post: { id, url },
        },
      },
    } = await (
      await fetch('https://gql.hashnode.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${token}`,
        },
        body: JSON.stringify({
          query,
        }),
      })
    ).json();

    return {
      postId: id,
      releaseURL: url,
    };
  }
}
