/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { customFetch } from './custom.fetch.func';

const lastCall = (mock: ReturnType<typeof vi.fn>) => {
  const [url, init] = mock.mock.calls.at(-1) as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string> };
};

describe('customFetch', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    document.cookie = '';
  });

  it('prefixes the base url', async () => {
    await customFetch({ baseUrl: 'https://api.test' })('/posts');

    expect(lastCall(fetchMock).url).toBe('https://api.test/posts');
  });

  it('includes credentials when secured, and omits them when not', async () => {
    await customFetch({ baseUrl: '' })('/a');
    expect(lastCall(fetchMock).init.credentials).toBe('include');

    await customFetch({ baseUrl: '' }, undefined, undefined, false)('/a');
    expect(lastCall(fetchMock).init.credentials).toBeUndefined();
  });

  it('sets a JSON content type, but not for FormData', async () => {
    await customFetch({ baseUrl: '' })('/a', { body: JSON.stringify({ a: 1 }) });
    expect(lastCall(fetchMock).headers['Content-Type']).toBe('application/json');

    // The browser has to set the multipart boundary itself.
    await customFetch({ baseUrl: '' })('/a', { body: new FormData() });
    expect(lastCall(fetchMock).headers['Content-Type']).toBeUndefined();
  });

  it('prefers the auth argument over a cookie', async () => {
    document.cookie = 'auth=from-cookie';

    await customFetch({ baseUrl: '' }, 'from-argument')('/a');

    expect(lastCall(fetchMock).headers.auth).toBe('from-argument');
  });

  it('falls back to the auth cookie', async () => {
    document.cookie = 'auth=from-cookie';

    await customFetch({ baseUrl: '' })('/a');

    expect(lastCall(fetchMock).headers.auth).toBe('from-cookie');
  });

  it('forwards showorg and impersonate cookies as headers', async () => {
    document.cookie = 'showorg=org-1';
    document.cookie = 'impersonate=membership-1';

    await customFetch({ baseUrl: '' })('/a');

    const { headers } = lastCall(fetchMock);
    expect(headers.showorg).toBe('org-1');
    expect(headers.impersonate).toBe('membership-1');
  });

  it('defaults to no-store, and does not override an explicit force-cache', async () => {
    await customFetch({ baseUrl: '' })('/a');
    expect(lastCall(fetchMock).init.cache).toBe('no-store');

    // force-cache survives from the spread options: the no-store default is
    // skipped rather than the caller's choice being dropped.
    await customFetch({ baseUrl: '' })('/a', { cache: 'force-cache' });
    expect(lastCall(fetchMock).init.cache).toBe('force-cache');
  });

  it('lets beforeRequest replace the request options', async () => {
    const beforeRequest = vi.fn(async () => ({ method: 'PUT' }));

    await customFetch({ baseUrl: '', beforeRequest })('/a', { method: 'GET' });

    expect(beforeRequest).toHaveBeenCalled();
    expect(lastCall(fetchMock).init.method).toBe('PUT');
  });

  it('returns the response when afterRequest approves it', async () => {
    const response = await customFetch({
      baseUrl: '',
      afterRequest: async () => true,
    })('/a');

    expect(response.status).toBe(200);
  });

  it('never settles when afterRequest returns false', async () => {
    // Deliberate in production: the 401 handler navigates away, so the caller
    // must not continue. It is also a silent way to hang a test, which is why
    // it is pinned here rather than discovered through a timeout.
    const pending = customFetch({
      baseUrl: '',
      afterRequest: async () => false,
    })('/a');

    const outcome = await Promise.race([
      pending.then(() => 'settled'),
      new Promise((resolve) => setTimeout(() => resolve('never-settled'), 50)),
    ]);

    expect(outcome).toBe('never-settled');
  });
});
