import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { LinkedinProvider } from '@gitroom/nestjs-libraries/integrations/social/linkedin.provider';

export class LinkedinPageProvider
  extends LinkedinProvider
  implements SocialProvider
{
  override identifier = 'linkedin-page';
  override name = 'LinkedIn Page';
  override isBetweenSteps = true;

  override async refreshToken(
    refresh_token: string
  ): Promise<AuthTokenDetails> {
    const { access_token: accessToken, refresh_token: refreshToken } = await (
      await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      })
    ).json();

    const { vanityName } = await (
      await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    const {
      name,
      sub: id,
      picture,
    } = await (
      await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return {
      id,
      accessToken,
      refreshToken,
      name,
      picture,
      username: vanityName,
    };
  }

  override async generateAuthUrl(refresh?: string) {
    const state = makeId(6);
    const codeVerifier = makeId(30);
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${
      process.env.LINKEDIN_CLIENT_ID
    }&redirect_uri=${encodeURIComponent(
      `${process.env.FRONTEND_URL}/integrations/social/linkedin-page${
        refresh ? `?refresh=${refresh}` : ''
      }`
    )}&state=${state}&scope=${encodeURIComponent(
      'openid profile w_member_social r_basicprofile rw_organization_admin w_organization_social r_organization_social'
    )}`;
    return {
      url,
      codeVerifier,
      state,
    };
  }

  async companies(accessToken: string) {
    const { elements } = await (
      await fetch(
        'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~(localizedName,vanityName,logoV2(original~:playableStreams))))',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
    ).json();

    return (elements || []).map((e: any) => ({
      id: e.organizationalTarget.split(':').pop(),
      page: e.organizationalTarget.split(':').pop(),
      username: e['organizationalTarget~'].vanityName,
      name: e['organizationalTarget~'].localizedName,
      picture:
        e['organizationalTarget~'].logoV2?.['original~']?.elements?.[0]
          ?.identifiers?.[0]?.identifier,
    }));
  }

  async fetchPageInformation(accessToken: string, pageId: string) {
    const data = await (
      await fetch(
        `https://api.linkedin.com/v2/organizations/${pageId}?projection=(id,localizedName,vanityName,logoV2(original~:playableStreams))`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
    ).json();

    return {
      id: data.id,
      name: data.localizedName,
      access_token: accessToken,
      picture: data?.logoV2?.['original~']?.elements?.[0]?.identifiers?.[0].identifier,
      username: data.vanityName,
    };
  }

  override async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('code', params.code);
    body.append(
      'redirect_uri',
      `${process.env.FRONTEND_URL}/integrations/social/linkedin-page${
        params.refresh ? `?refresh=${params.refresh}` : ''
      }`
    );
    body.append('client_id', process.env.LINKEDIN_CLIENT_ID!);
    body.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET!);

    const {
      access_token: accessToken,
      expires_in: expiresIn,
      refresh_token: refreshToken,
    } = await (
      await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })
    ).json();

    const {
      name,
      sub: id,
      picture,
    } = await (
      await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    const { vanityName } = await (
      await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return {
      id,
      accessToken,
      refreshToken,
      expiresIn,
      name,
      picture,
      username: vanityName,
    };
  }

  override async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    return super.post(id, accessToken, postDetails, 'company');
  }
}
