import { timer } from '@gitroom/helpers/utils/timer';
import { concurrencyService } from '@gitroom/helpers/utils/concurrency.service';

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

export abstract class SocialAbstract {
  abstract identifier: string;

  public handleErrors(
    body: string
  ): { type: 'refresh-token' | 'bad-body'; value: string } | undefined {
    return undefined;
  }

  async runInConcurrent<T>(func: (...args: any[]) => Promise<T>) {
    const value = await concurrencyService<any>(this.identifier.split('-')[0], async () => {
      try {
        return await func();
      } catch (err) {
        return {type: 'error', value: err};
      }
    });

    if (value && value.type === 'error') {
      throw value.value;
    }

    return value;
  }

  async fetch(
    url: string,
    options: RequestInit = {},
    identifier = '',
    totalRetries = 0
  ): Promise<Response> {
    const request = await concurrencyService(
      this.identifier.split('-')[0],
      () => fetch(url, options)
    );

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

    if (request.status === 500 || json.includes('rate_limit_exceeded') || json.includes('Rate limit')) {
      await timer(5000);
      return this.fetch(url, options, identifier, totalRetries + 1);
    }

    const handleError = this.handleErrors(json || '{}');

    if (
      request.status === 401 &&
      (handleError?.type === 'refresh-token' || !handleError)
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
