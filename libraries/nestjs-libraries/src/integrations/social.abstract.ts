export class RefreshToken {}
export class BadBody {
  constructor(public body: BodyInit) {
  }
}

export class NotEnoughScopes {}

export abstract class SocialAbstract {
  async fetch(url: string, options: RequestInit = {}) {
    const request = await fetch(url, options);

    if (request.status !== 200 && request.status !== 201) {
      try {
        console.log(await request.json());
      }
      catch (err) {
        console.log('skip');
      }
    }
    if (request.status === 401) {
      throw new RefreshToken();
    }

    if (request.status === 400) {
      throw new BadBody(options.body!);
    }

    return request;
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
