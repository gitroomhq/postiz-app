import { timer } from '@gitroom/helpers/utils/timer';
import pThrottle from 'p-throttle';

export class RefreshToken {
  constructor(
    public identifier: string,
    public json: string,
    public body: BodyInit,
    public message = ''
  ) {}
}
export class BadBody {
  constructor(
    public identifier: string,
    public json: string,
    public body: BodyInit,
    public message = ''
  ) {}
}

export class NotEnoughScopes {
  constructor(public message = 'Not enough scopes') {}
}

const pThrottleInstance = pThrottle({
  limit: 1,
  interval: 5000,
});

export abstract class SocialAbstract {
  private fetchInstance = pThrottleInstance(
    (url: RequestInfo, options?: RequestInit) => fetch(url, options)
  );

  public handleErrors(
    body: string
  ): { type: 'refresh-token' | 'bad-body'; value: string } | undefined {
    return { type: 'bad-body', value: 'bad request' };
  }

  async fetch(
    url: string,
    options: RequestInit = {},
    identifier = '',
    totalRetries = 0
  ): Promise<Response> {
    const request = await this.fetchInstance(url, options);

    if (request.status === 200 || request.status === 201) {
      return request;
    }

    if (totalRetries > 2) {
      console.log('bad body retries');
      throw new BadBody(identifier, '{}', options.body || '{}');
    }

    let json = '{}';
    try {
      json = await request.text();
      console.log(json);
    } catch (err) {
      json = '{}';
    }

    if (json.includes('rate_limit_exceeded') || json.includes('Rate limit')) {
      await timer(5000);
      console.log('rate limit trying again');
      return this.fetch(url, options, identifier, totalRetries + 1);
    }

    const handleError = this.handleErrors(json || '{}');

    if (request.status === 401 && (handleError?.type === 'refresh-token' || !handleError)) {
      console.log('refresh token', json);
      throw new RefreshToken(
        identifier,
        json,
        options.body!,
        handleError?.value
      );
    }

    throw new BadBody(identifier, json, options.body!, handleError?.value || '');
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
