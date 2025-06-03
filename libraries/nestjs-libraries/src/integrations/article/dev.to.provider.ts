import { ArticleProvider } from '@gitroom/nestjs-libraries/integrations/article/article.integrations.interface';
import { DevToSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/dev.to.settings.dto';

export class DevToProvider implements ArticleProvider {
  identifier = 'devto';
  name = 'Dev.to';
  async authenticate(token: string) {
    const { name, id, profile_image, username } = await (
      await fetch('https://dev.to/api/users/me', {
        headers: {
          'api-key': token,
        },
      })
    ).json();

    return {
      id,
      name,
      token,
      picture: profile_image,
      username,
    };
  }

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

  async post(token: string, content: string, settings: DevToSettingsDto) {
    const { id, url } = await (
      await fetch(`https://dev.to/api/articles`, {
        method: 'POST',
        body: JSON.stringify({
          article: {
            title: settings.title,
            body_markdown: content,
            published: true,
            main_image: settings?.main_image?.path
              ? `${
                  settings?.main_image?.path.indexOf('http') === -1
                    ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/${process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY}`
                    : ``
                }${settings?.main_image?.path}`
              : undefined,
            tags: settings?.tags?.map((t) => t.label),
            organization_id: settings.organization,
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'api-key': token,
        },
      })
    ).json();

    return {
      postId: String(id),
      releaseURL: url,
    };
  }
}
