import { test as base, expect, type APIRequestContext } from '@playwright/test';

/**
 * The deployment under test. Unlike e2e/fixtures/index.ts this talks to a real
 * Postiz over HTTP only - there is no database handle, no seeded org and no
 * mock provider, because none of those exist on the far side of a Railway URL.
 */
export type Gate = {
  url: string;
  apiKey: string;
  publishChannels: string[];
};

const list = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export const gate: Gate = {
  url: (process.env.POSTIZ_SMOKE_URL ?? '').replace(/\/+$/, ''),
  apiKey: process.env.POSTIZ_SMOKE_API_KEY ?? '',
  publishChannels: list(process.env.POSTIZ_SMOKE_PUBLISH_CHANNELS),
};

export const RUN_ID = `${Date.now().toString(36)}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;

export type Channel = {
  id: string;
  name: string;
  identifier: string;
  disabled: boolean;
};

export type RemotePost = {
  id: string;
  state: 'QUEUE' | 'PUBLISHED' | 'ERROR' | 'DRAFT';
  releaseURL: string | null;
  content: string;
  integration: { id: string; providerIdentifier: string; name: string };
};

/** The window every read is scoped to. Wide enough to survive clock skew. */
const window = () => ({
  startDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  endDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
});

export class PostizClient {
  constructor(private request: APIRequestContext) {}

  private get headers() {
    return { Authorization: gate.apiKey, 'Content-Type': 'application/json' };
  }

  async channels(): Promise<Channel[]> {
    const response = await this.request.get(`${gate.url}/public/v1/integrations`, {
      headers: this.headers,
    });
    expect(
      response.ok(),
      `GET /public/v1/integrations failed: ${response.status()} ${await response.text()}`
    ).toBeTruthy();
    return response.json();
  }

  async posts(): Promise<RemotePost[]> {
    const response = await this.request.get(`${gate.url}/public/v1/posts`, {
      headers: this.headers,
      params: window(),
    });
    expect(
      response.ok(),
      `GET /public/v1/posts failed: ${response.status()} ${await response.text()}`
    ).toBeTruthy();
    const { posts } = await response.json();
    return posts;
  }

  async post(id: string): Promise<RemotePost | undefined> {
    return (await this.posts()).find((p) => p.id === id);
  }

  async create(body: Record<string, unknown>) {
    const response = await this.request.post(`${gate.url}/public/v1/posts`, {
      headers: this.headers,
      data: body,
    });
    const text = await response.text();
    expect(
      response.ok(),
      `POST /public/v1/posts failed: ${response.status()} ${text}`
    ).toBeTruthy();
    return JSON.parse(text) as Array<{ postId: string; integration: string }>;
  }

  /**
   * Best effort on purpose: a failed cleanup must not turn a green deploy gate
   * red, and the post it could not remove is named in the report either way.
   */
  async remove(id: string): Promise<boolean> {
    try {
      const response = await this.request.delete(
        `${gate.url}/public/v1/posts/${id}`,
        { headers: this.headers }
      );
      return response.ok();
    } catch {
      return false;
    }
  }
}

export const test = base.extend<{ postiz: PostizClient }>({
  postiz: async ({ request }, use) => {
    await use(new PostizClient(request));
  },
});

export { expect };
