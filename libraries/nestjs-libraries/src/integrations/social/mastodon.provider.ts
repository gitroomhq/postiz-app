import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { getSsrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { number, string } from 'yup';
import FormDataUpload from 'form-data';
import { PassThrough, Readable } from 'stream';

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

    return undefined;
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

  async uploadFile(
    instanceUrl: string,
    fileUrl: string,
    accessToken: string,
    alt?: string
  ) {
    // The file is streamed straight from storage into the Mastodon upload
    // request instead of being buffered in memory. Both requests keep the
    // SSRF-safe dispatcher because the URLs are not fully under our control,
    // and the whole request is rebuilt per attempt by runStreamedUpload since
    // a consumed stream can't be replayed.
    const media = await this.runStreamedUpload<{ id: string }>(async () => {
      const fileResponse = await fetch(fileUrl, {
        // @ts-ignore - undici-only option; blocks SSRF to internal IPs
        dispatcher: getSsrfSafeDispatcher(),
      });
      if (!fileResponse.ok || !fileResponse.body) {
        throw new Error(`Failed to fetch media: ${fileResponse.statusText}`);
      }
      const contentLength = Number(
        fileResponse.headers.get('content-length') || 0
      );

      const form = new FormDataUpload();
      form.append('file', Readable.fromWeb(fileResponse.body as any), {
        filename: fileUrl.split('/').pop()?.split('?')[0] || 'file',
        ...(contentLength ? { knownLength: contentLength } : {}),
      });
      if (alt) {
        form.append('description', alt);
      }

      const mediaResponse = await fetch(`${instanceUrl}/api/v1/media`, {
        method: 'POST',
        headers: {
          ...form.getHeaders(),
          // Some Mastodon front-ends reject chunked multipart, so send an
          // exact Content-Length whenever the source size is known.
          ...(contentLength
            ? { 'Content-Length': String(form.getLengthSync()) }
            : {}),
          Authorization: `Bearer ${accessToken}`,
        },
        // form-data is an old-style stream undici can't consume directly;
        // piping through a PassThrough turns it into a proper Readable.
        body: form.pipe(new PassThrough()),
        // Required by undici when streaming a request body.
        duplex: 'half',
        // @ts-ignore - undici-only option; blocks SSRF to internal IPs
        dispatcher: getSsrfSafeDispatcher(),
      } as any);

      if (
        mediaResponse.status !== 200 &&
        mediaResponse.status !== 201 &&
        mediaResponse.status !== 202
      ) {
        throw {
          response: {
            status: mediaResponse.status,
            data: await mediaResponse.text().catch(() => '{}'),
          },
        };
      }

      return (await mediaResponse.json()) as { id: string };
    }, this.identifier);

    return media.id;
  }

  async dynamicPost(
    id: string,
    accessToken: string,
    url: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;

    const uploadFiles = await Promise.all(
      firstPost?.media?.map((media) =>
        this.uploadFile(url, media.path, accessToken, media.alt)
      ) || []
    );

    const form = new FormData();
    form.append('status', firstPost.message);
    form.append('visibility', 'public');
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

    return [
      {
        id: firstPost.id,
        postId: post.id,
        releaseURL: `${url}/statuses/${post.id}`,
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
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [commentPost] = postDetails;
    const replyToId = lastCommentId || postId;

    const uploadFiles = await Promise.all(
      commentPost?.media?.map((media) =>
        this.uploadFile(url, media.path, accessToken, media.alt)
      ) || []
    );

    const form = new FormData();
    form.append('status', commentPost.message);
    form.append('visibility', 'public');
    form.append('in_reply_to_id', replyToId);
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

    return [
      {
        id: commentPost.id,
        postId: post.id,
        releaseURL: `${url}/statuses/${post.id}`,
        status: 'completed',
      },
    ];
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

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    return this.dynamicComment(
      id,
      postId,
      lastCommentId,
      accessToken,
      process.env.MASTODON_URL || 'https://mastodon.social',
      postDetails
    );
  }
}
