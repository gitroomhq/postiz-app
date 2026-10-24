import { afterAll, afterEach, beforeAll } from 'vitest';
import { http, passthrough } from 'msw';
import { setupServer } from 'msw/node';
import { MastodonMock } from './handlers/mastodon.router';

/**
 * In-process network interception for provider tests.
 *
 * MSW v2 replaces `globalThis.fetch`, which is what SocialAbstract.fetch and
 * the raw fetch in MastodonProvider.checkPostStatus both use - so the
 * `dispatcher` option they pass is never consulted and provider code runs
 * completely unmodified, including its real request building, auth headers and
 * error parsing.
 */
export const mastodon = new MastodonMock();

export const server = setupServer(
  http.all('*', async ({ request }) => {
    const response = await mastodon.handle(request.clone() as Request);
    return response ?? passthrough();
  })
);

/**
 * Call from a spec's setup. Kept explicit rather than auto-registered in a
 * global setup file so that unit tests which do not want interception are
 * unaffected.
 */
export function useMastodonMock() {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => {
    server.resetHandlers();
    mastodon.reset();
  });
  afterAll(() => server.close());

  return mastodon;
}
