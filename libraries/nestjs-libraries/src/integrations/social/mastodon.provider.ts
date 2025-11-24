import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import dayjs from 'dayjs';

export class MastodonProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 5; // Mastodon instances typically have generous limits
  identifier = 'mastodon';
  name = 'Mastodon';
  isBetweenSteps = false;
  scopes = ['write:statuses', 'profile', 'write:media'];
  editor = 'normal' as const;
  maxLength() {
    return 500;
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
  protected generateUrlDynamic(
    customUrl: string,
    state: string,
    clientId: string,
    url: string
  ) {
    return `${customUrl}/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
      `${url}/integrations/social/mastodon`
    )}&scope=${this.scopes.join('+')}&state=${state}`;
  }

  async generateAuthUrl() {
    const state = makeId(6);
    const url = this.generateUrlDynamic(
      process.env.MASTODON_URL || 'https://mastodon.social',
      state,
      process.env.MASTODON_CLIENT_ID!,
      process.env.FRONTEND_URL!
    );
    return {
      url,
      codeVerifier: makeId(10),
      state,
    };
  }

  protected async dynamicAuthenticate(
    clientId: string,
    clientSecret: string,
    url: string,
    code: string
  ) {
    const form = new FormData();
    form.append('client_id', clientId);
    form.append('client_secret', clientSecret);
    form.append('code', code);
    form.append('grant_type', 'authorization_code');
    form.append(
      'redirect_uri',
      `${process.env.FRONTEND_URL}/integrations/social/mastodon`
    );
    form.append('scope', this.scopes.join(' '));

    const tokenInformation = await (
      await this.fetch(`${url}/oauth/token`, {
        method: 'POST',
        body: form,
      })
    ).json();

    const personalInformation = await (
      await this.fetch(`${url}/api/v1/accounts/verify_credentials`, {
        headers: {
          Authorization: `Bearer ${tokenInformation.access_token}`,
        },
      })
    ).json();

    return {
      id: personalInformation.id,
      name: personalInformation.display_name || personalInformation.acct,
      accessToken: tokenInformation.access_token,
      refreshToken: 'null',
      expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
      picture: personalInformation?.avatar || '',
      username: personalInformation.username,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    return this.dynamicAuthenticate(
      process.env.MASTODON_CLIENT_ID!,
      process.env.MASTODON_CLIENT_SECRET!,
      process.env.MASTODON_URL || 'https://mastodon.social',
      params.code
    );
  }

  async uploadFile(instanceUrl: string, fileUrl: string, accessToken: string) {
    const form = new FormData();
    form.append('file', await fetch(fileUrl).then((r) => r.blob()));
    const media = await (
      await this.fetch(`${instanceUrl}/api/v1/media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      })
    ).json();
    return media.id;
  }

  async dynamicPost(
    id: string,
    accessToken: string,
    url: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    let loadId = '';
    const ids = [] as string[];
    for (const getPost of postDetails) {
      const uploadFiles = await Promise.all(
        getPost?.media?.map((media) =>
          this.uploadFile(url, media.path, accessToken)
        ) || []
      );

      const form = new FormData();
      form.append('status', getPost.message);
      form.append('visibility', 'public');
      if (loadId) {
        form.append('in_reply_to_id', loadId);
      }
      if (uploadFiles.length) {
        for (const file of uploadFiles) {
          form.append('media_ids[]', file);
        }
      }

      const post = await (
        await this.fetch(`${url}/api/v1/statuses`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: form,
        })
      ).json();

      ids.push(post.id);
      loadId = loadId || post.id;
    }

    return postDetails.map((p, i) => ({
      id: p.id,
      postId: ids[i],
      releaseURL: `${url}/statuses/${ids[i]}`,
      status: 'completed',
    }));
  }

  async post(
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
