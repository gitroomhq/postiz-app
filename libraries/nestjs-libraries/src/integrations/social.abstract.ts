import { timer } from '@gitroom/helpers/utils/timer';

export class RefreshToken {
  constructor(
    public identifier: string,
    public json: string,
    public body: BodyInit
  ) {}
}
export class BadBody {
  constructor(
    public identifier: string,
    public json: string,
    public body: BodyInit
  ) {}
}

export class NotEnoughScopes {
  constructor(public message = 'Not enough scopes') {}
}

export abstract class SocialAbstract {
  async fetch(
    url: string,
    options: RequestInit = {},
    identifier = '',
    totalRetries = 0
  ): Promise<Response> {
    const request = await fetch(url, options);
``
    if (request.status === 200 || request.status === 201) {
      return request;
    }

    if (totalRetries > 2) {
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
      await timer(2000);
      return this.fetch(url, options, identifier, totalRetries + 1);
    }

    if (
      request.status === 401 ||
      (json.includes('OAuthException') &&
        !json.includes('The user is not an Instagram Business') &&
        !json.includes('Unsupported format') &&
        !json.includes('2207018') &&
        !json.includes('352') &&
        !json.includes('REVOKED_ACCESS_TOKEN'))
    ) {
      throw new RefreshToken(identifier, json, options.body!);
    }

    if (totalRetries < 2) {
      await timer(2000);
      return this.fetch(url, options, identifier, totalRetries + 1);
    }

    throw new BadBody(identifier, json, options.body!);
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
