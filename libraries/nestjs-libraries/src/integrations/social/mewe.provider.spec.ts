import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { MeweProvider } from './mewe.provider';

const provider = new MeweProvider();
const integration = { profile: 'me' } as never;

const HOST = 'https://mewe.test';

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello mewe',
  settings: { postType: 'group', group: 'group-1' },
  ...over,
});

beforeEach(() => {
  process.env.MEWE_HOST = HOST;
  process.env.MEWE_APP_ID = 'app-1';
  process.env.MEWE_API_KEY = 'key-1';
  process.env.FRONTEND_URL = 'https://app.postiz.test';
});

describe('MeweProvider identity', () => {
  it('declares its editor and length cap', () => {
    expect(provider.identifier).toBe('mewe');
    expect(provider.editor).toBe('normal');
    expect(provider.maxLength()).toBe(63206);
  });

  it('returns an empty token set on refresh, because MeWe has no refresh flow', async () => {
    await expect(provider.refreshToken('x')).resolves.toMatchObject({
      accessToken: '',
      expiresIn: 0,
    });
  });
});

describe('MeweProvider.handleErrors', () => {
  it.each([
    ['Unauthorized', 'refresh-token'],
    ['Enhance Your Calm', 'retry'],
    ['420 rate limited', 'retry'],
    ['Forbidden', 'bad-body'],
  ])('classifies %s as %s', (body, type) => {
    expect(provider.handleErrors(body)?.type).toBe(type);
  });

  it('leaves anything else to the default handling', () => {
    expect(provider.handleErrors('Internal Server Error')).toBeUndefined();
    expect(provider.handleErrors('')).toBeUndefined();
  });
});

describe('MeweProvider.generateAuthUrl', () => {
  it('points at the configured host with the app id', async () => {
    const { url, state } = await provider.generateAuthUrl();
    const params = new URL(url).searchParams;

    expect(url.startsWith(`${HOST}/login`)).toBe(true);
    expect(params.get('client_id')).toBe('app-1');
    expect(params.get('state')).toBe(state);
    expect(params.get('redirect_uri')).toBe(
      'https://app.postiz.test/integrations/social/mewe'
    );
  });

  it('falls back to mewe.com when no host is configured', async () => {
    delete process.env.MEWE_HOST;

    const { url } = await provider.generateAuthUrl();

    expect(url.startsWith('https://mewe.com/login')).toBe(true);
  });
});

describe('MeweProvider.authenticate', () => {
  const authRoutes = (over: Record<string, unknown> = {}) =>
    stubFetch([
      ['/api/dev/token', () => ({ apiToken: 'api-1', ...over })],
      [
        '/api/dev/me',
        () => ({ userId: 'user-1', name: 'A Member', handle: 'amember' }),
      ],
    ]);

  it('exchanges the login request token and reads the profile', async () => {
    const fetchStub = authRoutes();

    await expect(
      provider.authenticate({ code: 'login-token', codeVerifier: 'v' })
    ).resolves.toMatchObject({
      id: 'user-1',
      name: 'A Member',
      username: 'amember',
      accessToken: 'api-1',
      picture: '',
    });

    expect(fetchStub.urls()[0]).toContain('loginRequestToken=login-token');
    expect(fetchStub.calls[0].init.headers).toMatchObject({
      'X-App-Id': 'app-1',
      'X-Api-Key': 'key-1',
    });
  });

  it('authorizes the profile read with the exchanged token', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'login-token', codeVerifier: 'v' });

    expect(fetchStub.calls[1].init.headers).toMatchObject({
      Authorization: 'Bearer api-1',
    });
  });

  it('refuses an empty login request token before calling MeWe', async () => {
    const fetchStub = stubFetch([]);

    await expect(
      provider.authenticate({ code: '', codeVerifier: 'v' })
    ).resolves.toBe('No login request token received. Please try again.');
    expect(fetchStub.calls).toHaveLength(0);
  });

  it('explains a pending approval rather than failing silently', async () => {
    // The user has to approve the connect inside MeWe; until they do, the
    // exchange answers "pending" with a 200.
    authRoutes({ pending: true, apiToken: undefined });

    await expect(
      provider.authenticate({ code: 'login-token', codeVerifier: 'v' })
    ).resolves.toBe('Login request is still pending. Please approve on MeWe and try again.');
  });

  it('explains a rejected exchange', async () => {
    stubFetch([['/api/dev/token', () => new Response('nope', { status: 401 })]]);

    await expect(
      provider.authenticate({ code: 'login-token', codeVerifier: 'v' })
    ).resolves.toBe('Failed to exchange token. Please try again.');
  });

  it('explains an exchange that returned no token at all', async () => {
    authRoutes({ apiToken: undefined });

    await expect(
      provider.authenticate({ code: 'login-token', codeVerifier: 'v' })
    ).resolves.toBe('No API token received. Please try again.');
  });

  it('explains a profile read that failed', async () => {
    stubFetch([
      ['/api/dev/token', () => ({ apiToken: 'api-1' })],
      ['/api/dev/me', () => new Response('nope', { status: 500 })],
    ]);

    await expect(
      provider.authenticate({ code: 'login-token', codeVerifier: 'v' })
    ).resolves.toBe('Failed to fetch MeWe profile.');
  });

  it('reports a network failure rather than throwing', async () => {
    stubFetch([]);

    await expect(
      provider.authenticate({ code: 'login-token', codeVerifier: 'v' })
    ).resolves.toBe('MeWe authentication failed. Please try again.');
  });

  it('builds a name from the first and last name when there is no display name', async () => {
    stubFetch([
      ['/api/dev/token', () => ({ apiToken: 'api-1' })],
      [
        '/api/dev/me',
        () => ({ userId: 'u', firstName: 'Ada', lastName: 'Lovelace' }),
      ],
    ]);

    await expect(
      provider.authenticate({ code: 'login-token', codeVerifier: 'v' })
    ).resolves.toMatchObject({ name: 'Ada Lovelace', username: '' });
  });

  it('honours the expiry MeWe reports', async () => {
    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
    authRoutes({ expiresAt });

    const result = await provider.authenticate({
      code: 'login-token',
      codeVerifier: 'v',
    });

    const days = (result as { expiresIn: number }).expiresIn / 86400;
    expect(days).toBeGreaterThan(6);
    expect(days).toBeLessThan(8);
  });

  it('defaults to thirty days when MeWe reports no expiry', async () => {
    authRoutes();

    const result = await provider.authenticate({
      code: 'login-token',
      codeVerifier: 'v',
    });

    const days = (result as { expiresIn: number }).expiresIn / 86400;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31);
  });
});

describe('MeweProvider.groups', () => {
  it('reduces the group list to id and name', async () => {
    stubFetch([
      [
        '/api/dev/groups',
        () => ({ groups: [{ groupId: 1, name: 'Photography' }] }),
      ],
    ]);

    await expect(
      provider.groups('token', {}, 'id', integration)
    ).resolves.toEqual([{ id: '1', name: 'Photography' }]);
  });

  it('follows pagination until there is no next page', async () => {
    let call = 0;
    stubFetch([
      [
        '/api/dev/groups',
        () =>
          call++ === 0
            ? { groups: [{ groupId: 1, name: 'One' }], nextPage: '/api/dev/groups?p=2' }
            : { groups: [{ groupId: 2, name: 'Two' }] },
      ],
    ]);

    await expect(
      provider.groups('token', {}, 'id', integration)
    ).resolves.toEqual([
      { id: '1', name: 'One' },
      { id: '2', name: 'Two' },
    ]);
  });

  it('stops rather than looping when a page fails', async () => {
    stubFetch([['/api/dev/groups', () => new Response('nope', { status: 500 })]]);

    await expect(
      provider.groups('token', {}, 'id', integration)
    ).resolves.toEqual([]);
  });

  it('returns an empty list rather than throwing on a network failure', async () => {
    stubFetch([]);

    await expect(
      provider.groups('token', {}, 'id', integration)
    ).resolves.toEqual([]);
  });
});

describe('MeweProvider.post', () => {
  const postRoutes = () =>
    stubFetch([
      ['/api/dev/photo/upload', () => ({ id: 'photo-1' })],
      [/\/api\/dev\/(me|group\/[^/]+)\/post/, () => new Response(null, { status: 204 })],
      ['https://cdn.test/', () => new Response('bytes')],
    ]);

  it('posts to a group by id', async () => {
    const fetchStub = postRoutes();

    const [result] = await provider.post('id', 'token', [post() as never], integration);

    expect(fetchStub.urls()[0]).toBe(`${HOST}/api/dev/group/group-1/post`);
    expect(fetchStub.body(/group\/group-1\/post/)).toEqual({ text: 'hello mewe' });
    expect(result).toMatchObject({
      id: 'post-1',
      status: 'success',
      releaseURL: 'https://mewe.com/group/group-1',
    });
  });

  it('posts to the personal timeline when asked', async () => {
    const fetchStub = postRoutes();

    const [result] = await provider.post(
      'id',
      'token',
      [post({ settings: { postType: 'timeline' } }) as never],
      integration
    );

    expect(fetchStub.urls()[0]).toBe(`${HOST}/api/dev/me/post`);
    expect(result.releaseURL).toBe('https://mewe.com/me/posts');
  });

  it('uploads each image first and attaches the ids', async () => {
    const fetchStub = postRoutes();

    await provider.post(
      'id',
      'token',
      [
        post({
          media: [
            { type: 'image', path: 'https://cdn.test/a.png' },
            { type: 'image', path: 'https://cdn.test/b.png' },
          ],
        }) as never,
      ],
      integration
    );

    expect(fetchStub.countTo('/api/dev/photo/upload')).toBe(2);
    expect(fetchStub.body(/group\/group-1\/post/).uploadedPhotoIds).toEqual([
      'photo-1',
      'photo-1',
    ]);
  });

  it('skips videos, which MeWe does not accept through this endpoint', async () => {
    const fetchStub = postRoutes();

    await provider.post(
      'id',
      'token',
      [post({ media: [{ type: 'video', path: 'https://cdn.test/clip.mp4' }] }) as never],
      integration
    );

    expect(fetchStub.countTo('/api/dev/photo/upload')).toBe(0);
    expect(fetchStub.body(/group\/group-1\/post/)).not.toHaveProperty(
      'uploadedPhotoIds'
    );
  });

  it('omits the photo list entirely for a text-only post', async () => {
    const fetchStub = postRoutes();

    await provider.post('id', 'token', [post() as never], integration);

    expect(fetchStub.body(/group\/group-1\/post/)).not.toHaveProperty(
      'uploadedPhotoIds'
    );
  });

  it('raises the classified message when MeWe rejects the post', async () => {
    stubFetch([
      [
        /\/api\/dev\/group\/[^/]+\/post/,
        () => new Response('Unauthorized', { status: 401 }),
      ],
    ]);

    await expect(
      provider.post('id', 'token', [post() as never], integration)
    ).rejects.toThrow('Access token expired, please re-authenticate');
  });

  it('raises a generic failure for an unclassified rejection', async () => {
    stubFetch([
      [
        /\/api\/dev\/group\/[^/]+\/post/,
        () => new Response('Internal Server Error', { status: 500 }),
      ],
    ]);

    await expect(
      provider.post('id', 'token', [post() as never], integration)
    ).rejects.toThrow('Failed to create MeWe post');
  });

  it('raises when a photo upload fails, rather than posting without it', async () => {
    stubFetch([
      ['https://cdn.test/', () => new Response('bytes')],
      ['/api/dev/photo/upload', () => new Response('too big', { status: 413 })],
    ]);

    await expect(
      provider.post(
        'id',
        'token',
        [post({ media: [{ type: 'image', path: 'https://cdn.test/a.png' }] }) as never],
        integration
      )
    ).rejects.toThrow('Photo upload failed');
  });

  it('invents a post id, because MeWe answers 204 with no body', async () => {
    postRoutes();

    const [result] = await provider.post('id', 'token', [post() as never], integration);

    expect(result.postId).toHaveLength(12);
  });
});
