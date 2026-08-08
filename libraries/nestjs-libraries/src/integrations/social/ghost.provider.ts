import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { GhostSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/ghost.settings.dto';
import { getSsrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { sign } from 'jsonwebtoken';

type GhostCredentials = {
  siteUrl: string;
  adminApiKey: string;
};

type GhostSiteResponse = {
  site?: {
    title?: string;
    url?: string;
    icon?: string;
    logo?: string;
  };
};

type GhostPostResponse = {
  posts?: Array<{
    id: string;
    url?: string;
  }>;
};

export class GhostProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 3;
  identifier = 'ghost';
  name = 'Ghost';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'html' as const;
  dto = GhostSettingsDto;

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

  async customFields() {
    return [
      {
        key: 'siteUrl',
        label: 'Site URL',
        validation: `/^https?:\\/\\/(?:www\\.)?[\\w\\-]+(\\.[\\w\\-]+)+([\\/?#][^\\s]*)?$/`,
        type: 'text' as const,
      },
      {
        key: 'adminApiKey',
        label: 'Admin API key',
        validation: `/^[a-fA-F0-9]+:[a-fA-F0-9]+$/`,
        type: 'password' as const,
        hint: 'Create it in Ghost Admin -> Settings -> Integrations -> Custom integration.',
      },
    ];
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const credentials = this.parseCredentials(params.code);

    if (!this.isValidAdminApiKey(credentials.adminApiKey)) {
      return 'Invalid Ghost Admin API key. It should look like id:secret from a Ghost custom integration.';
    }

    let response: Response;
    try {
      response = await fetch(this.apiUrl(credentials.siteUrl, '/site/'), {
        headers: this.headers(credentials.adminApiKey),
        // @ts-ignore - undici-only option; blocks SSRF to internal IPs
        dispatcher: getSsrfSafeDispatcher(),
      });
    } catch (err) {
      console.log(err);
      return 'Could not reach your Ghost site. Check the Site URL and that the site is publicly accessible.';
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.log(
        `Ghost auth failed for ${credentials.siteUrl} (HTTP ${response.status})`,
        body.slice(0, 500)
      );

      if (response.status === 401 || response.status === 403) {
        return 'Ghost rejected the Admin API key. Check that you copied the Admin API key, not the Content API key.';
      }

      return `Ghost returned an unexpected error (HTTP ${response.status}).`;
    }

    let data: GhostSiteResponse;
    try {
      data = await response.json();
    } catch (err) {
      console.log(err);
      return 'Ghost did not return a valid response.';
    }

    const site = data.site || {};
    const token = Buffer.from(JSON.stringify(credentials)).toString('base64');

    return {
      refreshToken: '',
      expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
      accessToken: token,
      id: site.url || credentials.siteUrl,
      name: site.title || 'Ghost',
      picture: site.icon || site.logo || '',
      username: site.url || credentials.siteUrl,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<GhostSettingsDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const credentials = this.parseCredentials(accessToken);
    const post = postDetails?.[0];
    const settings = post?.settings || ({} as GhostSettingsDto);
    const search = new URLSearchParams({ source: 'html' });
    const newsletter = settings.newsletter?.trim();
    const status = settings.status || 'published';

    if (newsletter && status === 'published') {
      search.set('newsletter', newsletter);
      if (settings.emailSegment) {
        search.set('email_segment', settings.emailSegment);
      }
    }

    const response = (await (
      await this.fetch(this.apiUrl(credentials.siteUrl, `/posts/?${search}`), {
        method: 'POST',
        headers: this.headers(credentials.adminApiKey, true),
        body: JSON.stringify({
          posts: [
            {
              title: settings.title,
              html: post.message,
              status,
              ...(settings.canonical
                ? { canonical_url: settings.canonical }
                : {}),
              ...(settings.emailOnly && newsletter && status === 'published'
                ? { email_only: true }
                : {}),
              ...(settings.tags
                ? {
                    tags: this.parseTags(settings.tags).map((name) => ({
                      name,
                    })),
                  }
                : {}),
              ...(settings.main_image?.path
                ? { feature_image: this.mediaUrl(settings.main_image.path) }
                : {}),
            },
          ],
        }),
      })
    ).json()) as GhostPostResponse;

    const [createdPost] = Array.isArray(response.posts) ? response.posts : [];

    if (!createdPost?.id) {
      throw new Error('Ghost post creation did not return a post id.');
    }

    return [
      {
        id: post.id,
        status: 'completed',
        postId: createdPost.id,
        releaseURL:
          createdPost?.url ||
          `${credentials.siteUrl}/ghost/#/editor/post/${createdPost.id}`,
      },
    ];
  }

  private parseCredentials(token: string): GhostCredentials {
    const body = JSON.parse(Buffer.from(token, 'base64').toString()) as {
      siteUrl: string;
      adminApiKey: string;
    };

    return {
      siteUrl: body.siteUrl.trim().replace(/\/+$/, ''),
      adminApiKey: body.adminApiKey.trim(),
    };
  }

  private isValidAdminApiKey(adminApiKey: string) {
    const [keyId, secret] = adminApiKey.split(':');
    return !!keyId && !!secret && /^[a-fA-F0-9]+$/.test(secret);
  }

  private headers(adminApiKey: string, withJson = false) {
    return {
      Authorization: `Ghost ${this.adminToken(adminApiKey)}`,
      'Accept-Version': 'v5.0',
      ...(withJson ? { 'Content-Type': 'application/json' } : {}),
    };
  }

  private adminToken(adminApiKey: string) {
    const [keyId, secret] = adminApiKey.split(':');

    return sign(
      {
        aud: '/admin/',
      },
      Buffer.from(secret, 'hex'),
      {
        algorithm: 'HS256',
        expiresIn: '5m',
        keyid: keyId,
      }
    );
  }

  private apiUrl(siteUrl: string, path: string) {
    return `${siteUrl}/ghost/api/admin${path}`;
  }

  private parseTags(tags: string) {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  private mediaUrl(path: string) {
    if (path.indexOf('http') === 0) {
      return path;
    }

    return `${process.env.NEXT_PUBLIC_BACKEND_URL}/${process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY}${path}`;
  }
}
