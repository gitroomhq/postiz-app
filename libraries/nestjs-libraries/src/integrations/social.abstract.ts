export class RefreshToken {
}

export abstract class SocialAbstract {
  async fetch(url: string, options: RequestInit = {}) {
    const request = await fetch(url, options);
    if (request.status === 401) {
      throw new RefreshToken();
    }

    return request;
  }
}