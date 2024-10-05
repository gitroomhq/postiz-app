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

export class NotEnoughScopes {}

export abstract class SocialAbstract {
  async fetch(url: string, options: RequestInit = {}, identifier = '') {
    const request = await fetch(url, options);

    if (request.status === 200 || request.status === 201) {
      return request;
    }

    let json = '{}';
    try {
      json = await request.text();
    } catch (err) {
      json = '{}';
    }

    if (request.status === 401) {
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
