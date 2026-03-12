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
import { WordpressDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/wordpress.dto';
import slugify from 'slugify';
// import FormData from 'form-data';
import axios from 'axios';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';
import { string } from 'yup';

export class WordpressProvider
  extends SocialAbstract
  implements SocialProvider
{
  identifier = 'wordpress';
  name = 'WordPress';
  isBetweenSteps = false;
  editor = 'html' as const;
  scopes = [] as string[];
  override maxConcurrentJob = 5; // WordPress self-hosted typically has generous limits
  dto = WordpressDto;
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
    if (body.indexOf('rest_cannot_create') > -1) {
      return {
        type: 'bad-body',
        value: 'The connect user has insufficient permissions to create posts',
      };
    }
    return undefined;
  }

  async customFields() {
    return [
      {
        key: 'domain',
        label: 'Domain URL',
        validation: `/^https?:\\/\\/(?:www\\.)?[\\w\\-]+(\\.[\\w\\-]+)+([\\/?#][^\\s]*)?$/`,
        type: 'text' as const,
      },
      {
        key: 'username',
        label: 'Username',
        validation: `/.+/`,
        type: 'text' as const,
      },
      {
        key: 'password',
        label: 'Password',
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
      username: string;
      password: string;
    };
    try {
      const auth = Buffer.from(`${body.username}:${body.password}`).toString(
        'base64'
      );
      const { id, name, avatar_urls, code } = await (
        await fetch(`${body.domain}/wp-json/wp/v2/users/me`, {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        })
      ).json();

      if (code) {
        throw "Invalid credentials";
      }

      const biggestImage = Object.entries(avatar_urls || {}).reduce(
        (all, current) => {
          if (all > Number(current[0])) {
            return all;
          }
          return Number(current[0]);
        },
        0
      );

      return {
        refreshToken: '',
        expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
        accessToken: params.code,
        id: body.domain + '_' + id,
        name,
        picture: avatar_urls?.[String(biggestImage)] || '',
        username: body.username,
      };
    } catch (err) {
      console.log(err);
      return 'Invalid credentials';
    }
  }

  private parseToken(token: string) {
    const body = JSON.parse(Buffer.from(token, 'base64').toString()) as {
      domain: string;
      username: string;
      password: string;
    };
    const auth = Buffer.from(`${body.username}:${body.password}`).toString(
      'base64'
    );
    return { ...body, auth };
  }

  @Tool({
    description: 'Get list of post types',
    dataSchema: [],
  })
  async postTypes(token: string) {
    const { domain, auth } = this.parseToken(token);

    const postTypes = await (
      await this.fetch(`${domain}/wp-json/wp/v2/types`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      })
    ).json();

    return Object.entries<any>(postTypes).reduce((all, [key, value]) => {
      if (
        key.indexOf('wp_') > -1 ||
        key.indexOf('nav_') > -1 ||
        key === 'attachment'
      ) {
        return all;
      }

      all.push({
        id: value.rest_base,
        name: value.name,
      });

      return all;
    }, []);
  }

  @Tool({
    description: 'Get list of authors',
    dataSchema: [],
  })
  async authors(token: string) {
    const { domain, auth } = this.parseToken(token);

    const users = await (
      await this.fetch(`${domain}/wp-json/wp/v2/users?per_page=100`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      })
    ).json();

    return (users as any[]).map((u: any) => ({
      id: u.id,
      name: u.name,
    }));
  }

  @Tool({
    description: 'Get list of categories',
    dataSchema: [],
  })
  async categories(token: string) {
    const { domain, auth } = this.parseToken(token);

    const categories = await (
      await this.fetch(`${domain}/wp-json/wp/v2/categories?per_page=100`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      })
    ).json();

    return (categories as any[]).map((c: any) => ({
      id: c.id,
      name: c.name,
    }));
  }

  @Tool({
    description: 'Get list of tags',
    dataSchema: [],
  })
  async tags(token: string) {
    const { domain, auth } = this.parseToken(token);

    const tags = await (
      await this.fetch(`${domain}/wp-json/wp/v2/tags?per_page=100`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      })
    ).json();

    return (tags as any[]).map((t: any) => ({
      id: t.id,
      name: t.name,
    }));
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<WordpressDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const { domain, auth } = this.parseToken(accessToken);

    let mediaId = '';
    if (postDetails?.[0]?.settings?.main_image?.path) {
      console.log(
        'Uploading image to WordPress',
        postDetails[0].settings.main_image.path
      );

      const blob = await this.fetch(
        postDetails[0].settings.main_image.path
      ).then((r) => r.blob());

      const mediaResponse = await (
        await this.fetch(`${domain}/wp-json/wp/v2/media`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Disposition': `attachment; filename="${postDetails[0].settings.main_image.path
              .split('/')
              .pop()}"`,
            'Content-Type': blob.type,
          },
          body: blob,
        })
      ).json();

      mediaId = mediaResponse.id;
    }

    const settings = postDetails?.[0]?.settings;

    const submit = await (
      await this.fetch(
        `${domain}/wp-json/wp/v2/${settings?.type}`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify({
            title: settings?.title,
            content: postDetails?.[0]?.message,
            slug: settings?.slug || slugify(settings?.title, {
              lower: true,
              strict: true,
              trim: true,
            }),
            status: settings?.status || 'publish',
            ...(mediaId ? { featured_media: mediaId } : {}),
            ...(settings?.author ? { author: settings.author } : {}),
            ...(settings?.excerpt ? { excerpt: settings.excerpt } : {}),
            ...(settings?.categories?.length
              ? { categories: settings.categories.map((c) => c.value) }
              : {}),
            ...(settings?.tags?.length
              ? { tags: settings.tags.map((t) => t.value) }
              : {}),
          }),
        }
      )
    ).json();

    return [
      {
        id: postDetails?.[0].id,
        status: 'completed',
        postId: String(submit.id),
        releaseURL: submit.link,
      },
    ];
  }
}
