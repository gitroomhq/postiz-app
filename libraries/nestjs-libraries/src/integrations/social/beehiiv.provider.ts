import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';
import { makeSecureId } from '@gitroom/nestjs-libraries/services/make.secure.id';
import { BeehiivDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/beehiiv.dto';

const BEEHIIV_OAUTH_URL = 'https://app.beehiiv.com/oauth';
const BEEHIIV_API_URL = 'https://api.beehiiv.com/v2';

interface BeehiivTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

interface BeehiivWorkspace {
  data: {
    id: string;
    name: string;
  };
}

interface BeehiivPublications {
  data: {
    id: string;
    name: string;
    organization_name: string;
  }[];
}

export class BeehiivProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 3;
  identifier = 'beehiiv';
  name = 'beehiiv';
  isBetweenSteps = true;
  scopes = ['identify:read', 'publications:read', 'posts:write'];
  editor = 'html' as const;
  dto = BeehiivDto;

  maxLength() {
    return 100000000;
  }

  // beehiiv returns { errors: [{ message, code }] }, surface its message
  // instead of a generic failure (e.g. a plan that can't publish via the API).
  override handleErrors(body: string, status: number) {
    if ([400, 403, 404, 422].includes(status)) {
      try {
        const message = JSON.parse(body)?.errors?.[0]?.message;
        if (message) {
          return {
            type: 'bad-body' as const,
            value: message,
          };
        }
      } catch (err) {
        // Non-JSON error body
      }
    }

    return undefined;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const token = await this.requestToken(
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.BEEHIIV_CLIENT_ID!,
        client_secret: process.env.BEEHIIV_CLIENT_SECRET!,
      })
    );

    // beehiiv rotates the refresh token, so no extra call here that could fail
    // and lose it - reConnect fills the publication details afterwards.
    return {
      id: '',
      name: '',
      accessToken: token.access_token,
      refreshToken: token.refresh_token || refreshToken,
      expiresIn: token.expires_in,
      picture: '',
      username: '',
    };
  }

  async generateAuthUrl() {
    const state = makeSecureId(6);
    const params = new URLSearchParams({
      client_id: process.env.BEEHIIV_CLIENT_ID!,
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: this.scopes.join(' '),
      state,
    });

    return {
      url: `${BEEHIIV_OAUTH_URL}/authorize?${params.toString()}`,
      codeVerifier: makeSecureId(10),
      state,
    };
  }

  async authenticate(params: { code: string; codeVerifier: string }) {
    const token = await this.requestToken(
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: params.code,
        client_id: process.env.BEEHIIV_CLIENT_ID!,
        client_secret: process.env.BEEHIIV_CLIENT_SECRET!,
        redirect_uri: this.redirectUri(),
      })
    );

    if (token.scope) {
      this.checkScopes(this.scopes, token.scope);
    }

    const { data } = await this.getWorkspace(token.access_token);

    return {
      id: data.id,
      name: data.name,
      accessToken: token.access_token,
      refreshToken: token.refresh_token || '',
      expiresIn: token.expires_in,
      picture: '',
      username: data.name,
    };
  }

  async pages(accessToken: string) {
    const { data } = (await (
      await this.fetch(
        `${BEEHIIV_API_URL}/publications?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        this.identifier
      )
    ).json()) as BeehiivPublications;

    return data.map((publication) => ({
      id: publication.id,
      name: publication.name,
      username: publication.organization_name,
    }));
  }

  async fetchPageInformation(accessToken: string, data: { id: string }) {
    const publications = await this.pages(accessToken);
    const publication = publications.find((item) => item.id === data.id);

    if (!publication) {
      throw new Error('beehiiv publication not found');
    }

    return {
      id: publication.id,
      name: publication.name,
      access_token: accessToken,
      picture: '',
      username: publication.username,
    };
  }

  async reConnect(
    id: string,
    requiredId: string,
    accessToken: string
  ): Promise<Omit<AuthTokenDetails, 'refreshToken' | 'expiresIn'>> {
    const information = await this.fetchPageInformation(accessToken, {
      id: requiredId,
    });

    return {
      id: information.id,
      name: information.name,
      accessToken: information.access_token,
      picture: information.picture,
      username: information.username,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<BeehiivDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const { settings } = postDetails?.[0] || { settings: {} as BeehiivDto };

    const { data } = await (
      await this.fetch(
        `${BEEHIIV_API_URL}/publications/${id}/posts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title: settings.title,
            ...(settings.subtitle ? { subtitle: settings.subtitle } : {}),
            body_content: postDetails[0].message,
            status: settings.status || 'draft',
            ...(settings?.thumbnail?.path
              ? { thumbnail_image_url: settings.thumbnail.path }
              : {}),
          }),
        },
        this.identifier
      )
    ).json();

    return [
      {
        id: postDetails[0].id,
        status: 'completed',
        postId: data.id,
        releaseURL: data.preview_url || '',
      },
    ];
  }

  private redirectUri() {
    return `${process.env.FRONTEND_URL}/integrations/social/beehiiv`;
  }

  private async requestToken(body: URLSearchParams) {
    return (await (
      await this.fetch(`${BEEHIIV_OAUTH_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })
    ).json()) as BeehiivTokenResponse;
  }

  private async getWorkspace(accessToken: string) {
    return (await (
      await this.fetch(`${BEEHIIV_API_URL}/workspaces/identify`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json()) as BeehiivWorkspace;
  }
}
