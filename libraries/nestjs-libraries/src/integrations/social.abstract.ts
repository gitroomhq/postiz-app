import { timer } from '@gitroom/helpers/utils/timer';
import { Integration } from '@prisma/client';
import { ApplicationFailure } from '@temporalio/activity';
import { MediaCapabilities, PostingCapabilities, SocialProvider } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';

export class RefreshToken extends ApplicationFailure {
  constructor(identifier: string, json: string, body: BodyInit, message = '') {
    super(message, 'refresh_token', true, [
      {
        identifier,
        json,
        body,
      },
    ]);
  }
}

export class BadBody extends ApplicationFailure {
  constructor(identifier: string, json: string, body: BodyInit, message = '') {
    super(message, 'bad_body', true, [
      {
        identifier,
        json,
        body,
      },
    ]);
  }
}

export class NotEnoughScopes {
  constructor(
    public message = 'Not enough scopes, when choosing a provider, please add all the scopes'
  ) {}
}

function safeStringify(obj: any) {
  const seen = new WeakSet();

  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}

export abstract class SocialAbstract {
  abstract identifier: string;
  maxConcurrentJob = 1;
  mediaCapabilities: MediaCapabilities = {
    maxImages: 10,
    maxVideos: 1,
    canMixMediaTypes: true,
    requiresMedia: false,
    requiresVideo: false,
  };

  public handleErrors(
    body: string
  ):
    | { type: 'refresh-token' | 'bad-body' | 'retry'; value: string }
    | undefined {
    return undefined;
  }

  public async mention(
    token: string,
    d: { query: string },
    id: string,
    integration: Integration
  ): Promise<
    | { id: string; label: string; image: string; doNotCache?: boolean }[]
    | { none: true }
  > {
    return { none: true };
  }

  async runInConcurrent<T>(
    func: (...args: any[]) => Promise<T>,
    ignoreConcurrency?: boolean
  ) {
    let value: any;
    try {
      value = await func();
    } catch (err) {
      const handle = this.handleErrors(safeStringify(err));
      value = { err: true, value: 'Unknown Error', ...(handle || {}) };
    }

    if (value && value?.err && value?.value) {
      if (value.type === 'refresh-token') {
        throw new RefreshToken(
          '',
          safeStringify({}),
          {} as any,
          value.value || ''
        );
      }
      throw new BadBody('', safeStringify({}), {} as any, value.value || '');
    }

    return value;
  }

  async fetch(
    url: string,
    options: RequestInit = {},
    identifier = '',
    totalRetries = 0,
    ignoreConcurrency = false
  ): Promise<Response> {
    const request = await fetch(url, options);

    if (request.status === 200 || request.status === 201) {
      return request;
    }

    if (totalRetries > 2) {
      throw new BadBody(identifier, '{}', options.body || '{}');
    }

    let json = '{}';
    try {
      json = await request.text();
    } catch (err) {
      json = '{}';
    }

    if (
      request.status === 429 ||
      request.status === 500 ||
      json.includes('rate_limit_exceeded') ||
      json.includes('Rate limit')
    ) {
      await timer(5000);
      return this.fetch(
        url,
        options,
        identifier,
        totalRetries + 1,
        ignoreConcurrency
      );
    }

    const handleError = this.handleErrors(json || '{}');

    if (handleError?.type === 'retry') {
      await timer(5000);
      return this.fetch(
        url,
        options,
        identifier,
        totalRetries + 1,
        ignoreConcurrency
      );
    }

    if (
      (request.status === 401 &&
        (handleError?.type === 'refresh-token' || !handleError)) ||
      handleError?.type === 'refresh-token'
    ) {
      throw new RefreshToken(
        identifier,
        json,
        options.body!,
        handleError?.value
      );
    }

    throw new BadBody(
      identifier,
      json,
      options.body!,
      handleError?.value || ''
    );
  }

  getPostingCapabilities(additionalSettings?: any): PostingCapabilities {
    const self = this as unknown as SocialProvider & SocialAbstract;
    return {
      media: self.mediaCapabilities || this.mediaCapabilities,
      maxLength: self.maxLength(additionalSettings),
      editor: self.editor,
      supportsComments: typeof self.comment === 'function',
      supportsAnalytics: typeof self.analytics === 'function',
      supportsMentions: Object.getOwnPropertyNames(
        self.constructor.prototype
      ).includes('mention'),
      commentsMediaSupport: typeof self.comment === 'function'
        ? (self.commentsMediaSupport ?? true)
        : false,
    };
  }

  checkScopes(required: string[], got: string | string[]) {
    if (Array.isArray(got)) {
      if (!required.every((scope) => got.includes(scope))) {
        throw new NotEnoughScopes();
      }

      return true;
    }

    const newGot = decodeURIComponent(got);

    const splitType = newGot.indexOf(',') > -1 ? ',' : ' ';
    const gotArray = newGot.split(splitType);
    if (!required.every((scope) => gotArray.includes(scope))) {
      throw new NotEnoughScopes();
    }

    return true;
  }
}
