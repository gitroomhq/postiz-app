import {
  ClientInformation,
  PostDetails,
  PostResponse,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { MastodonProvider } from '@gitroom/nestjs-libraries/integrations/social/mastodon.provider';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

export class MastodonCustomProvider extends MastodonProvider {
  override identifier = 'mastodon-custom';
  override name = 'M. Instance';
  override maxConcurrentJob = 5; // Custom Mastodon instances typically have generous limits
  editor = 'normal' as const;

  async externalUrl(url: string) {
    const form = new FormData();
    form.append('client_name', 'Postiz');
    form.append(
      'redirect_uris',
      `${process.env.FRONTEND_URL}/integrations/social/mastodon`
    );
    form.append('scopes', this.scopes.join(' '));
    form.append('website', process.env.FRONTEND_URL!);
    const { client_id, client_secret, ...all } = await (
      await fetch(url + '/api/v1/apps', {
        method: 'POST',
        body: form,
      })
    ).json();

    return {
      client_id,
      client_secret,
    };
  }
  override async generateAuthUrl(
    refresh?: string,
    external?: ClientInformation
  ) {
    const state = makeId(6);
    const url = this.generateUrlDynamic(
      external?.instanceUrl!,
      state,
      external?.client_id!,
      process.env.FRONTEND_URL!,
      refresh
    );

    return {
      url,
      codeVerifier: makeId(10),
      state,
    };
  }

  override async authenticate(
    params: {
      code: string;
      codeVerifier: string;
      refresh?: string;
    },
    clientInformation?: ClientInformation
  ) {
    return this.dynamicAuthenticate(
      clientInformation?.client_id!,
      clientInformation?.client_secret!,
      clientInformation?.instanceUrl!,
      params.code
    );
  }

  override async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    return this.dynamicPost(
      id,
      accessToken,
      process.env.MASTODON_URL || 'https://mastodon.social',
      postDetails
    );
  }
}
