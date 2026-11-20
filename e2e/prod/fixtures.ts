import { test as base, expect, type APIRequestContext } from '@playwright/test';

/**
 * The deployment under test. Unlike e2e/fixtures/index.ts this talks to a real
 * Postiz over HTTP only - there is no database handle, no seeded org and no
 * mock provider, because none of those exist on the far side of a deployed URL.
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

/** The range every read is scoped to. Wide enough to survive clock skew. */
const readRange = () => ({
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
      params: readRange(),
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

  /**
   * The raw result, for callers that treat a 400 as information rather than a
   * failure - the settings DTO of whichever provider a channel belongs to runs
   * on every create, drafts included, so "this channel needs more settings" is
   * a normal answer.
   */
  async attemptCreate(body: Record<string, unknown>) {
    const response = await this.request.post(`${gate.url}/public/v1/posts`, {
      headers: this.headers,
      data: body,
    });
    const text = await response.text();
    return { ok: response.ok(), status: response.status(), text };
  }

  async create(body: Record<string, unknown>) {
    const { ok, status, text } = await this.attemptCreate(body);
    expect(ok, `POST /public/v1/posts failed: ${status} ${text}`).toBeTruthy();
    return JSON.parse(text) as Array<{ postId: string; integration: string }>;
  }

  /**
   * Reports whether the call was accepted rather than asserting, so a caller
   * cleaning up inside a `finally` cannot mask the failure it is unwinding
   * from. Note the endpoint answers 200 regardless, so the real proof a post
   * is gone is reading it back.
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
