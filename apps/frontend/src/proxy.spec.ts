import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const internalFetch = vi.fn();
vi.mock('@gitroom/helpers/utils/internal.fetch', () => ({
  internalFetch: (...args: unknown[]) => internalFetch(...args),
}));

import { NextRequest } from 'next/server';
import { proxy } from './proxy';

/**
 * Every redirect rule that decides whether a visitor sees the app or the login
 * screen lives in this one function, and none of it was covered.
 */
const request = (
  path: string,
  options: { cookies?: Record<string, string>; headers?: Record<string, string> } = {}
) => {
  const req = new NextRequest(new URL(path, 'http://localhost:4200'), {
    headers: options.headers,
  });

  for (const [name, value] of Object.entries(options.cookies ?? {})) {
    req.cookies.set(name, value);
  }

  return req;
};

const location = (response: Response) => response.headers.get('location') ?? '';

describe('proxy redirects', () => {
  beforeEach(() => {
    internalFetch.mockReset();
    process.env.FRONTEND_URL = 'http://localhost:4200';
    process.env.NOT_SECURED = 'true';
  });

  afterEach(() => {
    delete process.env.IS_GENERAL;
    delete process.env.DISABLE_REGISTRATION;
    delete process.env.POSTIZ_GENERIC_OAUTH;
  });

  describe('unauthenticated', () => {
    it('sends a protected route to the auth screen, preserving the query', async () => {
      const response = await proxy(request('/launches?foo=1'));

      expect(location(response)).toContain('/auth?foo=1');
    });

    it('appends the google provider hint', async () => {
      const response = await proxy(request('/settings/google'));

      expect(location(response)).toContain('provider=GOOGLE');
    });

    it('appends GITHUB for settings, or GENERIC when generic oauth is on', async () => {
      expect(location(await proxy(request('/settings')))).toContain('provider=GITHUB');

      process.env.POSTIZ_GENERIC_OAUTH = 'true';
      expect(location(await proxy(request('/settings')))).toContain('provider=GENERIC');
    });

    it('sends a modal route to the login-required screen', async () => {
      const response = await proxy(request('/modal/x/y'));

      expect(location(response)).toContain('/auth/login-required');
    });

    it('lets the auth screen itself through', async () => {
      const response = await proxy(request('/auth/login'));

      expect(response.headers.get('location')).toBeNull();
    });

    it('stores a pending org invite before login', async () => {
      const response = await proxy(request('/auth?org=org-1'));

      expect(location(response)).toContain('/');
      expect(response.cookies.get('org')?.value).toBe('org-1');
    });
  });

  describe('public paths', () => {
    it.each(['/uploads/a.png', '/p/post-1', '/provider/x', '/icons/y.svg'])(
      'lets %s through without authentication',
      async (path) => {
        expect((await proxy(request(path))).headers.get('location')).toBeNull();
      }
    );

    it('lets the oauth callback through, but not the login variant', async () => {
      expect(
        (await proxy(request('/integrations/social/mastodon'))).headers.get('location')
      ).toBeNull();

      expect(
        location(await proxy(request('/integrations/social/mastodon?state=login')))
      ).toContain('/auth');
    });
  });

  describe('authenticated', () => {
    const authed = { cookies: { auth: 'a-token' } };

    it('bounces away from the auth screen', async () => {
      const response = await proxy(request('/auth/login', authed));

      expect(location(response)).toBe('http://localhost:4200/');
    });

    it('sends the root to analytics, or to launches when general', async () => {
      expect(location(await proxy(request('/', authed)))).toContain('/analytics');

      process.env.IS_GENERAL = 'true';
      expect(location(await proxy(request('/', authed)))).toContain('/launches');
    });

    it('leaves an ordinary route alone', async () => {
      const response = await proxy(request('/launches', authed));

      expect(response.headers.get('location')).toBeNull();
    });

    it('joins an organization from ?org and stores the selection', async () => {
      internalFetch.mockResolvedValue({ json: async () => ({ id: 'org-9' }) });

      const response = await proxy(request('/launches?org=invite', authed));

      expect(internalFetch).toHaveBeenCalledWith('/user/join-org', expect.anything());
      expect(location(response)).toContain('/?added=true');
      expect(response.cookies.get('showorg')?.value).toBe('org-9');
    });

    it('logs out when joining an organization fails', async () => {
      // proxy() logs the error before redirecting; that is production
      // behaviour, but it would print on every run.
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      internalFetch.mockRejectedValue(new Error('backend down'));

      const response = await proxy(request('/launches?org=invite', authed));

      expect(location(response)).toContain('/auth/logout');
      log.mockRestore();
    });
  });

  describe('logout', () => {
    it('clears the auth cookie and returns to login', async () => {
      const response = await proxy(request('/auth/logout', { cookies: { auth: 'x' } }));

      expect(location(response)).toContain('/auth/login');
      expect(response.cookies.get('auth')?.value).toBe('');
    });
  });

  describe('registration', () => {
    it('redirects register to login when registration is disabled', async () => {
      process.env.DISABLE_REGISTRATION = 'true';

      const response = await proxy(request('/auth/register'));

      expect(location(response)).toContain('/auth/login');
    });

    it('allows register otherwise', async () => {
      const response = await proxy(request('/auth/register'));

      expect(response.headers.get('location')).toBeNull();
    });
  });
});
