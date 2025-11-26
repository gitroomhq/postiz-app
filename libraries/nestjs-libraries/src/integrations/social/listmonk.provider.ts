import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '../social.abstract';
import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from './social.integrations.interface';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { ListmonkDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/listmonk.dto';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import slugify from 'slugify';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';

export class ListmonkProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 100; // Bluesky has moderate rate limits
  identifier = 'listmonk';
  name = 'ListMonk';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'html' as const;
  dto = ListmonkDto;

  maxLength() {
    return 100000000;
  }

  async customFields() {
    return [
      {
        key: 'url',
        label: 'URL',
        defaultValue: '',
        validation: `/^(https?:\\/\\/)(?:\\S+(?::\\S*)?@)?(?:(?:localhost)|(?:\\d{1,3}(?:\\.\\d{1,3}){3})|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63})(?::\\d{2,5})?(?:\\/[^\\s?#]*)?(?:\\?[^\\s#]*)?(?:#[^\\s]*)?$/`,
        type: 'text' as const,
      },
      {
        key: 'username',
        label: 'Username',
        validation: `/^.+$/`,
        type: 'text' as const,
      },
      {
        key: 'password',
        label: 'Password',
        validation: `/^.{3,}$/`,
        type: 'password' as const,
      },
    ];
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

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url: '',
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const body: { url: string; username: string; password: string } =
      JSON.parse(Buffer.from(params.code, 'base64').toString());

    console.log(body);
    try {
      const basic = Buffer.from(body.username + ':' + body.password).toString(
        'base64'
      );

      const { data } = await (
        await this.fetch(body.url + '/api/settings', {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Basic ' + basic,
          },
        })
      ).json();

      return {
        refreshToken: basic,
        expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
        accessToken: basic,
        id: Buffer.from(body.url).toString('base64'),
        name: data['app.site_name'],
        picture: data['app.logo_url'] || '',
        username: data['app.site_name'],
      };
    } catch (e) {
      console.log(e);
      return 'Invalid credentials';
    }
  }

  @Tool({ description: 'List of available lists', dataSchema: [] })
  async list(
    token: string,
    data: any,
    internalId: string,
    integration: Integration
  ) {
    const body: { url: string; username: string; password: string } =
      JSON.parse(
        AuthService.fixedDecryption(integration.customInstanceDetails!)
      );

    const auth = Buffer.from(`${body.username}:${body.password}`).toString(
      'base64'
    );

    const postTypes = await (
      await this.fetch(`${body.url}/api/lists`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      })
    ).json();

    return postTypes.data.results.map((p: any) => ({ id: p.id, name: p.name }));
  }

  @Tool({ description: 'List of available templates', dataSchema: [] })
  async templates(
    token: string,
    data: any,
    internalId: string,
    integration: Integration
  ) {
    const body: { url: string; username: string; password: string } =
      JSON.parse(
        AuthService.fixedDecryption(integration.customInstanceDetails!)
      );

    const auth = Buffer.from(`${body.username}:${body.password}`).toString(
      'base64'
    );

    const postTypes = await (
      await this.fetch(`${body.url}/api/templates`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      })
    ).json();

    return [
      { id: 0, name: 'Default' },
      ...postTypes.data.map((p: any) => ({ id: p.id, name: p.name })),
    ];
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<ListmonkDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const body: { url: string; username: string; password: string } =
      JSON.parse(
        AuthService.fixedDecryption(integration.customInstanceDetails!)
      );

    const auth = Buffer.from(`${body.username}:${body.password}`).toString(
      'base64'
    );

    const sendBody = `
<style>
.content {
  padding: 20px;
  font-size: 15px;
  line-height: 1.6;
}
</style>
<div class="hidden-preheader"
       style="display:none !important; visibility:hidden; opacity:0; overflow:hidden;
              max-height:0; max-width:0; line-height:1px; font-size:1px; color:transparent;
              mso-hide:all;">
    <!-- A short visible decoy (optional): shows as "." or short text in preview -->
    ${postDetails?.[0]?.settings?.preview || ''}
    <!-- Then invisible padding to eat up preview characters -->
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    <!-- Repeat the trio (zero-width space, zero-width non-joiner, nbsp, BOM) a bunch of times -->
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
    &#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;&#8203;&zwnj;&nbsp;&#65279;
  </div>
  
  <div class="content">
    ${postDetails[0].message}
  </div>
`;

    const {
      data: { uuid: postId, id: campaignId },
    } = await (
      await this.fetch(body.url + '/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          name: slugify(postDetails[0].settings.subject, {
            lower: true,
            strict: true,
            trim: true,
          }),
          type: 'regular',
          content_type: 'html',
          subject: postDetails[0].settings.subject,
          lists: [+postDetails[0].settings.list],
          body: sendBody,
          ...(+postDetails?.[0]?.settings?.template
            ? { template_id: +postDetails[0].settings.template }
            : {}),
        }),
      })
    ).json();

    await this.fetch(body.url + `/api/campaigns/${campaignId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        status: 'running',
      }),
    });

    return [
      {
        id: postDetails[0].id,
        status: 'completed',
        releaseURL: `${body.url}/api/campaigns/${campaignId}/preview`,
        postId,
      },
    ];
  }
}
