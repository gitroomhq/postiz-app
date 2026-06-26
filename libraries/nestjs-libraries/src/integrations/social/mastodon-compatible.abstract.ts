import {
  AuthTokenDetails,
  ClientInformation,
  PostDetails,
  PostResponse,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { Integration } from '@prisma/client';
import dayjs from 'dayjs';
import {
  normalizeInstanceUrl,
  withSafeInstanceDispatcher,
} from '@gitroom/nestjs-libraries/integrations/social/fediverse-instance';

type OAuthTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
};

type AccountResponse = {
  acct?: string;
  avatar?: string;
  display_name?: string;
  id?: string | number;
  username?: string;
};

type StatusResponse = {
  id?: string;
  uri?: string;
  url?: string;
};

type MediaUploadLimits = {
  imageSizeLimit: number;
  supportedMimeTypes: string[];
};

const NON_EXPIRING_TOKEN_SECONDS =
  dayjs().add(100, 'years').unix() - dayjs().unix();

export abstract class MastodonCompatibleAbstract extends SocialAbstract {
  abstract override identifier: string;
  abstract name: string;
  abstract scopes: string[];
  refreshCron = false;

  protected getRedirectUri(): string {
    return `${process.env.FRONTEND_URL}/integrations/social/${this.identifier}`;
  }

  override handleErrors(
    body: string,
    status: number
  ):
    | { type: 'refresh-token' | 'bad-body' | 'retry'; value: string }
    | undefined {
    if (body.includes('Your login is currently disabled')) {
      return {
        type: 'refresh-token',
        value: 'Your login is currently disabled',
      };
    }
    if (status === 401 && this.refreshCron) {
      return {
        type: 'refresh-token',
        value: 'The access token has expired',
      };
    }

    return undefined;
  }

  async refreshToken(
    refreshToken: string,
    integration?: Integration
  ): Promise<AuthTokenDetails> {
    if (
      !refreshToken ||
      refreshToken === 'null' ||
      !integration?.customInstanceDetails
    ) {
      return this.emptyAuthDetails();
    }

    const details = this.getInstanceDetails(integration);
    const form = new FormData();
    form.append('client_id', details.client_id);
    form.append('client_secret', details.client_secret);
    form.append('refresh_token', refreshToken);
    form.append('grant_type', 'refresh_token');
    form.append('scope', this.scopes.join(' '));

    const tokenInformation = await this.requestInstanceJson<OAuthTokenResponse>(
      details.instanceUrl,
      '/oauth/token',
      { method: 'POST', body: form }
    );

    return this.getAuthenticatedAccount(
      details.instanceUrl,
      tokenInformation,
      refreshToken
    );
  }

  protected generateUrlDynamic(
    customUrl: string,
    state: string,
    clientId: string
  ) {
    const url = new URL('/oauth/authorize', normalizeInstanceUrl(customUrl));
    url.search = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: this.getRedirectUri(),
      scope: this.scopes.join(' '),
      state,
    }).toString();
    return url.toString();
  }

  protected async registerApplication(instanceUrl: string) {
    const form = new FormData();
    form.append('client_name', 'Postiz');
    form.append('redirect_uris', this.getRedirectUri());
    form.append('scopes', this.scopes.join(' '));
    form.append('website', process.env.FRONTEND_URL!);

    const application = await this.requestInstanceJson<{
      client_id?: string;
      client_secret?: string;
    }>(instanceUrl, '/api/v1/apps', { method: 'POST', body: form });

    if (!application.client_id || !application.client_secret) {
      throw new Error(
        'The instance did not return OAuth application credentials.'
      );
    }

    return {
      client_id: application.client_id,
      client_secret: application.client_secret,
    };
  }

  protected async requestInstanceJson<T>(
    instanceUrl: string,
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    return withSafeInstanceDispatcher(
      instanceUrl,
      async (origin, dispatcher) => {
        const response = await this.fetch(new URL(path, origin).toString(), {
          ...options,
          dispatcher,
          redirect: 'error',
        } as RequestInit);
        return (await response.json()) as T;
      }
    );
  }

  protected getInstanceDetails(
    integration: Integration
  ): ClientInformation & Record<string, unknown> {
    if (!integration.customInstanceDetails) {
      throw new Error('Missing instance credentials. Reconnect this channel.');
    }
    const details = JSON.parse(
      AuthService.fixedDecryption(integration.customInstanceDetails)
    );
    if (
      !details?.instanceUrl ||
      !details?.client_id ||
      !details?.client_secret
    ) {
      throw new Error('Invalid instance credentials. Reconnect this channel.');
    }
    return details;
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
    form.append('redirect_uri', this.getRedirectUri());
    form.append('scope', this.scopes.join(' '));

    const tokenInformation = await this.requestInstanceJson<OAuthTokenResponse>(
      url,
      '/oauth/token',
      { method: 'POST', body: form }
    );

    return this.getAuthenticatedAccount(url, tokenInformation);
  }

  private async getAuthenticatedAccount(
    instanceUrl: string,
    tokenInformation: OAuthTokenResponse,
    existingRefreshToken = ''
  ): Promise<AuthTokenDetails> {
    if (!tokenInformation.access_token) {
      throw new Error('The instance did not return an access token.');
    }

    const personalInformation = await this.requestInstanceJson<AccountResponse>(
      instanceUrl,
      '/api/v1/accounts/verify_credentials',
      {
        headers: {
          Authorization: `Bearer ${tokenInformation.access_token}`,
        },
      }
    );
    if (!personalInformation.id || !personalInformation.username) {
      throw new Error('The instance did not return a valid account.');
    }

    const hostname = new URL(instanceUrl).hostname;
    const baseHandle = personalInformation.acct || personalInformation.username;

    return {
      id: String(personalInformation.id),
      name: personalInformation.display_name
        ? `${personalInformation.display_name} · ${hostname}`
        : `${baseHandle}@${hostname}`,
      accessToken: tokenInformation.access_token,
      refreshToken:
        tokenInformation.refresh_token || existingRefreshToken || '',
      expiresIn:
        Number.isFinite(tokenInformation.expires_in) &&
        Number(tokenInformation.expires_in) > 0
          ? Number(tokenInformation.expires_in)
          : NON_EXPIRING_TOKEN_SECONDS,
      picture: personalInformation.avatar || '',
      username: `${personalInformation.username}@${hostname}`,
    };
  }

  private emptyAuthDetails(): AuthTokenDetails {
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

  async uploadFile(
    instanceUrl: string,
    fileUrl: string,
    accessToken: string,
    alt?: string,
    limits?: MediaUploadLimits
  ) {
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error('Could not read the media attachment.');
    }

    const file = await fileResponse.blob();
    if (limits && file.size > limits.imageSizeLimit) {
      throw new Error(
        `The media attachment exceeds this instance's ${limits.imageSizeLimit}-byte limit.`
      );
    }
    if (
      limits?.supportedMimeTypes.length &&
      file.type &&
      !limits.supportedMimeTypes.includes(file.type)
    ) {
      throw new Error(
        `This instance does not support ${file.type} attachments.`
      );
    }

    const form = new FormData();
    form.append('file', file);
    if (alt) {
      form.append('description', alt);
    }
    const media = await this.requestInstanceJson<{ id?: string }>(
      instanceUrl,
      '/api/v1/media',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      }
    );
    if (!media.id) {
      throw new Error('The instance did not return a media identifier.');
    }
    return media.id;
  }

  async dynamicPost(
    id: string,
    accessToken: string,
    url: string,
    postDetails: PostDetails[],
    mediaLimits?: MediaUploadLimits
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;
    if (!firstPost) {
      throw new Error('Missing post content.');
    }

    const uploadFiles = await Promise.all(
      firstPost.media?.map((media) =>
        this.uploadFile(url, media.path, accessToken, media.alt, mediaLimits)
      ) || []
    );

    const form = new FormData();
    form.append('status', firstPost.message);
    form.append('visibility', 'public');
    for (const file of uploadFiles) {
      form.append('media_ids[]', file);
    }

    const post = await this.requestInstanceJson<StatusResponse>(
      url,
      '/api/v1/statuses',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      }
    );
    if (!post.id) {
      throw new Error('The instance did not return a status identifier.');
    }

    return [
      {
        id: firstPost.id,
        postId: post.id,
        releaseURL:
          post.url ||
          post.uri ||
          new URL(`/statuses/${post.id}`, normalizeInstanceUrl(url)).toString(),
        status: 'completed',
      },
    ];
  }

  async dynamicComment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    url: string,
    postDetails: PostDetails[],
    mediaLimits?: MediaUploadLimits
  ): Promise<PostResponse[]> {
    const [commentPost] = postDetails;
    if (!commentPost) {
      throw new Error('Missing comment content.');
    }
    const replyToId = lastCommentId || postId;

    const uploadFiles = await Promise.all(
      commentPost.media?.map((media) =>
        this.uploadFile(url, media.path, accessToken, media.alt, mediaLimits)
      ) || []
    );

    const form = new FormData();
    form.append('status', commentPost.message);
    form.append('visibility', 'public');
    form.append('in_reply_to_id', replyToId);
    for (const file of uploadFiles) {
      form.append('media_ids[]', file);
    }

    const post = await this.requestInstanceJson<StatusResponse>(
      url,
      '/api/v1/statuses',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      }
    );
    if (!post.id) {
      throw new Error('The instance did not return a status identifier.');
    }

    return [
      {
        id: commentPost.id,
        postId: post.id,
        releaseURL:
          post.url ||
          post.uri ||
          new URL(`/statuses/${post.id}`, normalizeInstanceUrl(url)).toString(),
        status: 'completed',
      },
    ];
  }
}
