import {
  BadBody,
  SocialAbstract,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import {
  readWebhookChannel,
  WebhookChannel,
} from '@gitroom/nestjs-libraries/integrations/social/webhook.channel';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { getSsrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { makeSecureId } from '@gitroom/nestjs-libraries/services/make.secure.id';

const SEND_TIMEOUT = 30_000;

export function webhookPostBody(post: PostDetails, integration: Integration) {
  const image = Array.isArray(post.sourceImage)
    ? post.sourceImage
    : Array.isArray(post.media)
    ? post.media
    : [];
  const settings =
    post.settings && typeof post.settings === 'object' ? post.settings : {};

  return {
    id: post.id,
    content:
      typeof post.sourceContent === 'string' ? post.sourceContent : post.message,
    image,
    settings,
    publishDate: post.publishDate,
    releaseURL: '',
    state: post.state || '',
    integration: {
      id: integration.id,
      name: integration.name,
      providerIdentifier: integration.providerIdentifier,
      picture: integration.picture || '',
      type: integration.type,
    },
  };
}

function fail(message: string): never {
  throw new BadBody('webhook', '', '', message);
}

function isTimeout(err: unknown) {
  const name = (err as { name?: string; cause?: { name?: string } })?.name;
  const cause = (err as { cause?: { name?: string } })?.cause?.name;
  return name === 'TimeoutError' || cause === 'TimeoutError';
}

function isBlocked(err: unknown) {
  const message = String((err as { message?: string })?.message || '');
  const cause = String(
    (err as { cause?: { message?: string } })?.cause?.message || ''
  );
  return message.includes('Blocked IP') || cause.includes('Blocked IP');
}

@Rules(
  'Webhook sends the scheduled post as one JSON request to the URL saved on the channel. There is no settings panel. Media stays on the post and is not uploaded anywhere else.'
)
export class WebhookProvider extends SocialAbstract implements SocialProvider {
  identifier = 'webhook';
  name = 'Webhook';
  defaultPicture = '/icons/platforms/webhook.png';
  toolTip = 'Sends the scheduled post as an HTTPS request';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'normal' as const;
  override maxConcurrentJob = 5;

  maxLength() {
    return 100000;
  }

  async customFields() {
    return [
      {
        key: 'name',
        label: 'Name',
        validation: '/^.{1,100}$/',
        type: 'text' as const,
      },
      {
        key: 'url',
        label: 'URL',
        validation: '/^https:\\/\\/.+/',
        type: 'text' as const,
      },
      {
        key: 'headers',
        label: 'Headers',
        validation: '',
        type: 'headers' as const,
        hint: 'Optional. Each row is a header name and value. Values are stored with the channel and are not shown again.',
      },
    ];
  }

  async refreshToken(): Promise<AuthTokenDetails> {
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
    const state = makeSecureId(6);
    return {
      url: state,
      codeVerifier: makeSecureId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }): Promise<AuthTokenDetails | string> {
    let body: { name?: unknown; url?: unknown; headers?: unknown };
    try {
      body = JSON.parse(Buffer.from(params.code, 'base64').toString());
    } catch {
      return 'The connection details could not be read.';
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 100) {
      return 'The channel name is invalid.';
    }

    const channel = readWebhookChannel(body);
    if ('error' in channel) {
      return channel.error;
    }

    if (!(await isSafePublicHttpsUrl(channel.url))) {
      return 'The URL must be a public https address.';
    }

    return {
      // A new connect is its own channel, even when the URL matches an
      // existing one. Reconnect passes the current internal id as refresh
      // and must keep it, or the connect migrates the row instead of updating it.
      id: params.refresh || makeSecureId(16),
      name,
      accessToken: Buffer.from(JSON.stringify(channel)).toString('base64'),
      refreshToken: '',
      expiresIn: dayjs().add(100, 'year').unix() - dayjs().unix(),
      picture: this.defaultPicture,
      username: new URL(channel.url).hostname,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const results: PostResponse[] = [];
    for (const post of postDetails) {
      results.push(await this.deliver(accessToken, post, integration));
    }
    return results;
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    return this.post(id, accessToken, postDetails, integration);
  }

  private async deliver(
    accessToken: string,
    post: PostDetails,
    integration: Integration
  ): Promise<PostResponse> {
    const channel = this.readStored(accessToken);
    if (!(await isSafePublicHttpsUrl(channel.url))) {
      fail('The webhook URL is not allowed.');
    }

    const headers = new Headers();
    headers.set('content-type', 'application/json');
    for (const header of channel.headers) {
      headers.set(header.name, header.value);
    }

    let response: Response;
    try {
      response = await fetch(channel.url, {
        method: 'POST',
        headers,
        body: JSON.stringify([webhookPostBody(post, integration)]),
        redirect: 'manual',
        signal: AbortSignal.timeout(SEND_TIMEOUT),
        // @ts-ignore — undici option, not in lib.dom fetch types
        dispatcher: getSsrfSafeDispatcher(),
      });
    } catch (err) {
      if (isTimeout(err)) {
        fail('The webhook URL did not respond in time.');
      }
      if (isBlocked(err)) {
        fail('The webhook URL is not allowed.');
      }
      fail('Could not reach the webhook URL.');
    }

    try {
      if (response.status < 200 || response.status > 299) {
        fail(`The webhook URL returned HTTP ${response.status}`);
      }
    } finally {
      try {
        await response.body?.cancel();
      } catch {
        // closing the body must not replace the publish result
      }
    }

    return {
      id: post.id,
      postId: post.id,
      releaseURL: '',
      status: 'completed',
    };
  }

  private readStored(accessToken: string): WebhookChannel {
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(accessToken, 'base64').toString());
    } catch {
      fail('This webhook channel needs to be connected again.');
    }

    const channel = readWebhookChannel(parsed);
    if ('error' in channel) {
      fail(channel.error);
    }

    return channel;
  }
}
