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
    identifier = ''
  ): Promise<Response> {
    const request = await fetch(url, options);

    if (request.status === 200 || request.status === 201) {
      return request;
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
      return this.fetch(url, options, identifier);
    }

    if (
      request.status === 401 ||
      (json.includes('OAuthException') && !json.includes("Unsupported format") && !json.includes('2207018'))
    ) {
      throw new RefreshToken(identifier, json, options.body!);
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
