import { CreatePostDto } from '@gitroom/nestjs-libraries/dtos/posts/create.post.dto';
import { GetPostsDto } from '@gitroom/nestjs-libraries/dtos/posts/get.posts.dto';
import fetch, { FormData } from 'node-fetch';
import * as Sentry from '@sentry/node';
import crypto from 'crypto';

function toQueryString(obj: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return params.toString();
}

export default class Postiz {
  constructor(
    private _apiKey: string,
    private _path = 'https://api.postiz.com'
  ) {}

  async post(posts: CreatePostDto) {
    try {
      const apiHash = crypto.createHash('sha256').update(this._apiKey).digest('hex').slice(0, 8);
      try {
        Sentry.metrics.count('sdk.requests', 1, { tags: { method: 'post', api_key_hash: apiHash } } as any);
      } catch (e) {}
    } catch (e) {}

    return (
      await fetch(`${this._path}/public/v1/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this._apiKey,
        },
        body: JSON.stringify(posts),
      })
    ).json();
  }

  async postList(filters: GetPostsDto) {
    try {
      const apiHash = crypto.createHash('sha256').update(this._apiKey).digest('hex').slice(0, 8);
      try {
        Sentry.metrics.count('sdk.requests', 1, { tags: { method: 'list', api_key_hash: apiHash } } as any);
      } catch (e) {}
    } catch (e) {}

    return (
      await fetch(`${this._path}/public/v1/posts?${toQueryString(filters)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this._apiKey,
        },
      })
    ).json();
  }

  async upload(file: Buffer, extension: string) {
    try {
      const apiHash = crypto.createHash('sha256').update(this._apiKey).digest('hex').slice(0, 8);
      try {
        Sentry.metrics.count('sdk.requests', 1, { tags: { method: 'upload', api_key_hash: apiHash } } as any);
      } catch (e) {}
    } catch (e) {}

    const formData = new FormData();
    const type =
      extension === 'png'
        ? 'image/png'
        : extension === 'jpg'
        ? 'image/jpeg'
        : extension === 'gif'
        ? 'image/gif'
        : extension === 'jpeg'
        ? 'image/jpeg'
        : 'image/jpeg';

    const blob = new Blob([file], { type });
    formData.append('file', blob, extension);

    return (
      await fetch(`${this._path}/public/v1/upload`, {
        method: 'POST',
        // @ts-ignore
        body: formData,
        headers: {
          Authorization: this._apiKey,
        },
      })
    ).json();
  }

  async integrations() {
    try {
      const apiHash = crypto.createHash('sha256').update(this._apiKey).digest('hex').slice(0, 8);
      try {
        Sentry.metrics.count('sdk.requests', 1, { tags: { method: 'integrations', api_key_hash: apiHash } } as any);
      } catch (e) {}
    } catch (e) {}

    return (
      await fetch(`${this._path}/public/v1/integrations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this._apiKey,
        },
      })
    ).json();
  }

  deletePost(id: string) {
    try {
      const apiHash = crypto.createHash('sha256').update(this._apiKey).digest('hex').slice(0, 8);
      try {
        Sentry.metrics.count('sdk.requests', 1, { tags: { method: 'delete', api_key_hash: apiHash } } as any);
      } catch (e) {}
    } catch (e) {}

    return fetch(`${this._path}/public/v1/posts/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._apiKey,
      },
    });
  }
}
