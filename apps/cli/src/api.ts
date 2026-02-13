import fetch, { FormData } from 'node-fetch';

export interface PostizConfig {
  apiKey: string;
  apiUrl?: string;
}

export class PostizAPI {
  private apiKey: string;
  private apiUrl: string;

  constructor(config: PostizConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.postiz.com';
  }

  private async request(endpoint: string, options: any = {}) {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: this.apiKey,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error (${response.status}): ${error}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  async createPost(data: any) {
    return this.request('/public/v1/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listPosts(filters: any = {}) {
    const queryString = new URLSearchParams(
      Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    const endpoint = queryString
      ? `/public/v1/posts?${queryString}`
      : '/public/v1/posts';

    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async deletePost(id: string) {
    return this.request(`/public/v1/posts/${id}`, {
      method: 'DELETE',
    });
  }

  async upload(file: Buffer, filename: string) {
    const formData = new FormData();
    const extension = filename.split('.').pop() || 'jpg';

    const type =
      extension === 'png'
        ? 'image/png'
        : extension === 'jpg' || extension === 'jpeg'
        ? 'image/jpeg'
        : extension === 'gif'
        ? 'image/gif'
        : 'image/jpeg';

    const blob = new Blob([file], { type });
    formData.append('file', blob, filename);

    const url = `${this.apiUrl}/public/v1/upload`;
    const response = await fetch(url, {
      method: 'POST',
      // @ts-ignore
      body: formData,
      headers: {
        Authorization: this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed (${response.status}): ${error}`);
    }

    return await response.json();
  }

  async listIntegrations() {
    return this.request('/public/v1/integrations', {
      method: 'GET',
    });
  }
}
