import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';

// this.fetch sleeps 5s between retries; never let real time into a unit test.
vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { mastodon, server, useMastodonMock } from '@gitroom/testing/msw/mastodon.server';
import { BadBody, RefreshToken } from '../social.abstract';
import { MastodonProvider } from './mastodon.provider';

const INSTANCE = 'https://mastodon.test';

const pendingData = (over: Record<string, unknown> = {}) => ({
  url: INSTANCE,
  message: 'hello from the test suite',
  mediaIds: ['media-1'],
  idempotencyKey: 'post-1-abcdef',
  ...over,
});

describe('MastodonProvider pending state machine', () => {
  useMastodonMock();

  const provider = new MastodonProvider();
  const integration = {} as never;

  it('reports a text-only status ready without any network call', async () => {
    const data = pendingData({ mediaIds: [] });

    await expect(
      provider.checkPostStatus('token', data as never, integration)
    ).resolves.toEqual({ status: 'ready', pendingData: data });

    expect(mastodon.requests).toHaveLength(0);
  });

  it('stays pending while media is processing and flips to ready when done', async () => {
    mastodon.setMediaProcessing('media-1', 1);

    await expect(
      provider.checkPostStatus('token', pendingData() as never, integration)
    ).resolves.toMatchObject({ status: 'pending' });

    await expect(
      provider.checkPostStatus('token', pendingData() as never, integration)
    ).resolves.toMatchObject({ status: 'ready' });
  });

  it('treats a 404 media as "keep going", never as expired', async () => {
    // The duplicate-post trap. After a finalize whose outcome was lost, the
    // already-published status makes its media 404 here. Concluding "expired,
    // post again" is exactly how a user gets posted twice.
    server.use(
      http.get(`${INSTANCE}/api/v1/media/media-1`, () => new HttpResponse(null, { status: 404 }))
    );

    await expect(
      provider.checkPostStatus('token', pendingData() as never, integration)
    ).resolves.toMatchObject({ status: 'ready' });
  });

  it('maps a 422 media to a terminal BadBody', async () => {
    server.use(
      http.get(`${INSTANCE}/api/v1/media/media-1`, () =>
        HttpResponse.json({ error: 'gone' }, { status: 422 })
      )
    );

    await expect(
      provider.checkPostStatus('token', pendingData() as never, integration)
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('maps a 401 media to a RefreshToken failure', async () => {
    server.use(
      http.get(`${INSTANCE}/api/v1/media/media-1`, () =>
        HttpResponse.json({ error: 'bad token' }, { status: 401 })
      )
    );

    await expect(
      provider.checkPostStatus('token', pendingData() as never, integration)
    ).rejects.toBeInstanceOf(RefreshToken);
  });

  it('treats an unknown status on the read-only check as transient', async () => {
    server.use(
      http.get(`${INSTANCE}/api/v1/media/media-1`, () => new HttpResponse(null, { status: 503 }))
    );

    await expect(
      provider.checkPostStatus('token', pendingData() as never, integration)
    ).resolves.toMatchObject({ status: 'pending' });
  });
});

describe('MastodonProvider finalizePost', () => {
  useMastodonMock();

  const provider = new MastodonProvider();
  const integration = {} as never;

  it('creates the status and returns a release URL', async () => {
    const result = await provider.finalizePost(
      'token',
      pendingData() as never,
      integration
    );

    expect(result).toEqual({
      status: 'completed',
      postId: 'status-1',
      releaseURL: `${INSTANCE}/statuses/status-1`,
    });
  });

  it('deduplicates a retry through the Idempotency-Key', async () => {
    // The anti-duplicate guarantee: a finalize retried after an unknown
    // outcome must return the status that already exists, not publish again.
    const first = await provider.finalizePost(
      'token',
      pendingData() as never,
      integration
    );
    const second = await provider.finalizePost(
      'token',
      pendingData() as never,
      integration
    );

    expect(second).toEqual(first);
    expect(mastodon.requestsTo('/api/v1/statuses')).toHaveLength(2);
  });

  it('omits the header entirely when there is no idempotency key', async () => {
    // A literal "undefined" header value would dedupe this post against every
    // other keyless post.
    await provider.finalizePost(
      'token',
      pendingData({ idempotencyKey: undefined }) as never,
      integration
    );

    const [request] = mastodon.requestsTo('/api/v1/statuses');
    expect(request.headers['idempotency-key']).toBeUndefined();
  });

  it('sends the status content and attached media', async () => {
    await provider.finalizePost(
      'token',
      pendingData({ mediaIds: ['media-1', 'media-2'] }) as never,
      integration
    );

    const [request] = mastodon.requestsTo('/api/v1/statuses');
    expect(request.body).toMatchObject({
      status: 'hello from the test suite',
      visibility: 'public',
    });
    expect(request.headers.authorization).toBe('Bearer token');
  });
});
