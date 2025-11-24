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
      const { id, name, avatar_urls } = await (
        await fetch(`${body.domain}/wp-json/wp/v2/users/me`, {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        })
      ).json();

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

  @Tool({
    description: 'Get list of post types',
    dataSchema: [],
  })
  async postTypes(token: string) {
    const body = JSON.parse(Buffer.from(token, 'base64').toString()) as {
      domain: string;
      username: string;
      password: string;
    };

    const auth = Buffer.from(`${body.username}:${body.password}`).toString(
      'base64'
    );

    const postTypes = await (
      await this.fetch(`${body.domain}/wp-json/wp/v2/types`, {
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

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<WordpressDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const body = JSON.parse(Buffer.from(accessToken, 'base64').toString()) as {
      domain: string;
      username: string;
      password: string;
    };

    const auth = Buffer.from(`${body.username}:${body.password}`).toString(
      'base64'
    );

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
        await this.fetch(`${body.domain}/wp-json/wp/v2/media`, {
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

    const submit = await (
      await this.fetch(
        `${body.domain}/wp-json/wp/v2/${postDetails?.[0]?.settings?.type}`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify({
            title: postDetails?.[0]?.settings?.title,
            content: postDetails?.[0]?.message,
            slug: slugify(postDetails?.[0]?.settings?.title, {
              lower: true,
              strict: true,
              trim: true,
            }),
            status: 'publish',
            ...(mediaId ? { featured_media: mediaId } : {}),
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
