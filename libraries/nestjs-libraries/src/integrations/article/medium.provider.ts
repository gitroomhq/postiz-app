import { ArticleProvider } from '@gitroom/nestjs-libraries/integrations/article/article.integrations.interface';
import { MediumSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/medium.settings.dto';

export class MediumProvider implements ArticleProvider {
  identifier = 'medium';
  name = 'Medium';

  async authenticate(token: string) {
    const {
      data: { name, id, imageUrl, username },
    } = await (
      await fetch('https://api.medium.com/v1/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    ).json();

    return {
      id,
      name,
      token,
      picture: imageUrl,
      username,
    };
  }

  async publications(token: string) {
    const { id } = await this.authenticate(token);
    const { data } = await (
      await fetch(`https://api.medium.com/v1/users/${id}/publications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    ).json();

    return data;
  }

  async post(token: string, content: string, settings: MediumSettingsDto) {
    const { id } = await this.authenticate(token);
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
            content,
            ...(settings.canonical ? { canonicalUrl: settings.canonical } : {}),
            ...(settings?.tags?.length
              ? { tags: settings?.tags?.map((p) => p.value) }
              : {}),
            publishStatus: settings?.publication ? 'draft' : 'public',
          }),
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )
    ).json();

    return {
      postId: data.id,
      releaseURL: data.url,
    };
  }
}
