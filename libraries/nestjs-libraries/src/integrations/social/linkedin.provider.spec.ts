import { describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { BadBody } from '../social.abstract';
import { LinkedinProvider } from './linkedin.provider';

/**
 * LinkedIn is the only common provider that classifies failures as 'retry', so
 * it is where SocialAbstract's retry-then-reclassify loop is actually
 * exercised end to end.
 */
describe('LinkedinProvider.handleErrors', () => {
  const provider = new LinkedinProvider();

  it.each([
    ['Unable to obtain activity', 'Unable to obtain activity'],
    ['the resource is forbidden', 'Resource is forbidden'],
    ['503 Service Unavailable', 'Resource is forbidden'],
  ])('classifies %j as retryable', (body, value) => {
    expect(provider.handleErrors(body)).toEqual({ type: 'retry', value });
  });

  it('leaves an unrecognised body unclassified', () => {
    expect(provider.handleErrors('{"message":"something else"}')).toBeUndefined();
  });
});

describe('LinkedinProvider retry behaviour', () => {
  const provider = new LinkedinProvider();

  it('retries a transient failure and returns the eventual success', async () => {
    let attempt = 0;
    const fetchMock = vi.fn(async () =>
      attempt++ === 0
        ? new Response('Unable to obtain activity', { status: 500 })
        : new Response('{"id":"urn:li:share:1"}', { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await provider.fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
    });

    expect(await response.json()).toEqual({ id: 'urn:li:share:1' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up as BadBody once the retry budget is exhausted', async () => {
    const fetchMock = vi.fn(
      async () => new Response('Unable to obtain activity', { status: 500 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      provider.fetch('https://api.linkedin.com/rest/posts', { method: 'POST' })
    ).rejects.toBeInstanceOf(BadBody);

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe('LinkedinProvider.refreshToken', () => {
  const provider = new LinkedinProvider();

  it('resolves with empty credentials when the refresh is rejected', async () => {
    // Characterisation of a real defect. refreshToken calls the global fetch
    // directly instead of this.fetch, so a 400 is never classified into a
    // RefreshToken/BadBody ApplicationFailure and never goes through the
    // SSRF-safe dispatcher. Worse, the error body simply destructures to
    // undefined, so the call *succeeds* and hands back a token details object
    // with no token in it.
    //
    // postWorkflowV112 reads that as a successful refresh and retries the
    // publish with an undefined access token, instead of telling the user the
    // channel needs reconnecting. linkedin.page.provider.ts does the same.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"invalid_grant"}', { status: 400 }))
    );

    const result = await provider.refreshToken('expired-refresh-token');

    expect(result).toEqual({ picture: '' });
    expect(result.accessToken).toBeUndefined();
  });
});
