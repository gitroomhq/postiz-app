import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { NotEnoughScopes } from '../social.abstract';
import { DribbbleProvider } from './dribbble.provider';

const provider = new DribbbleProvider();

const dimensions = (width: number, height: number) =>
  vi
    .spyOn(provider as never as { getImageDimensions: unknown }, 'getImageDimensions' as never)
    .mockResolvedValue({ width, height } as never);

beforeEach(() => {
  process.env.DRIBBBLE_CLIENT_ID = 'client-1';
  process.env.DRIBBBLE_CLIENT_SECRET = 'secret-1';
  process.env.FRONTEND_URL = 'https://app.postiz.test';
});

describe('DribbbleProvider identity', () => {
  it('declares its editor and length cap', () => {
    expect(provider.identifier).toBe('dribbble');
    expect(provider.editor).toBe('normal');
    expect(provider.maxLength()).toBe(40000);
  });
});

describe('DribbbleProvider.checkValidity', () => {
  it('requires exactly one attachment', async () => {
    await expect(provider.checkValidity([[]])).resolves.toBe('Requires one item');
    await expect(
      provider.checkValidity([[{ path: '/a.png' }, { path: '/b.png' }]] as never)
    ).resolves.toBe('Requires one item');
  });

  it('refuses a video', async () => {
    await expect(provider.checkValidity([[{ path: '/clip.mp4' }]] as never)).resolves.toBe(
      'Does not support mp4 files'
    );
  });

  it.each([
    [400, 300],
    [800, 600],
  ])('accepts a %ix%i shot, the two sizes Dribbble allows', async (w, h) => {
    dimensions(w, h);

    await expect(
      provider.checkValidity([[{ path: '/shot.png' }]] as never)
    ).resolves.toBe(true);
  });

  it.each([
    [1200, 900],
    [401, 300],
    [800, 601],
  ])('rejects a %ix%i shot', async (w, h) => {
    dimensions(w, h);

    await expect(
      provider.checkValidity([[{ path: '/shot.png' }]] as never)
    ).resolves.toBe('Invalid image size. Requires 400x300 or 800x600 px images.');
  });
});

describe('DribbbleProvider.generateAuthUrl', () => {
  it('asks for the scopes it declares', async () => {
    const { url, state } = await provider.generateAuthUrl();
    const params = new URL(url).searchParams;

    expect(params.get('scope')!.split(' ')).toEqual(provider.scopes);
    expect(params.get('client_id')).toBe('client-1');
    expect(params.get('response_type')).toBe('code');
    expect(params.get('state')).toBe(state);
    expect(params.get('redirect_uri')).toBe(
      'https://app.postiz.test/integrations/social/dribbble'
    );
  });
});

describe('DribbbleProvider.authenticate', () => {
  const authRoutes = (scope = provider.scopes.join(',')) =>
    stubFetch([
      ['dribbble.com/oauth/token', () => ({ access_token: 'access-1', scope })],
      [
        'api.dribbble.com/v2/user',
        () => ({
          id: 42,
          name: 'A Designer',
          login: 'adesigner',
          avatar_url: 'https://cdn.test/me.png',
        }),
      ],
    ]);

  it('exchanges the code and describes the account', async () => {
    const fetchStub = authRoutes();

    await expect(
      provider.authenticate({ code: 'the-code', codeVerifier: 'v', refresh: '' })
    ).resolves.toMatchObject({
      id: 42,
      name: 'A Designer',
      username: 'adesigner',
      accessToken: 'access-1',
      picture: 'https://cdn.test/me.png',
    });
    expect(fetchStub.urls()[0]).toContain('code=the-code');
    expect(fetchStub.urls()[0]).toContain('client_secret=secret-1');
  });

  it('refuses a grant missing a scope it needs', async () => {
    authRoutes('public');

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: '' })
    ).rejects.toBeInstanceOf(NotEnoughScopes);
  });

  it('authorizes the profile read with the freshly issued token', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: '' });

    expect(fetchStub.calls[1].init.headers).toMatchObject({
      Authorization: 'Bearer access-1',
    });
  });
});

describe('DribbbleProvider.teams', () => {
  it('reduces the team list to id and name', async () => {
    const fetchStub = stubFetch([
      [
        'api.dribbble.com/v2/user',
        () => ({ teams: [{ id: 1, name: 'Studio', extra: 'ignored' }] }),
      ],
    ]);

    await expect(provider.teams('token')).resolves.toEqual([
      { id: 1, name: 'Studio' },
    ]);
    expect(fetchStub.calls[0].init.headers).toMatchObject({
      Authorization: 'Bearer token',
    });
  });

  it('returns an empty list for an account with no teams', async () => {
    stubFetch([['api.dribbble.com/v2/user', () => ({})]]);

    await expect(provider.teams('token')).resolves.toEqual([]);
  });
});

describe('DribbbleProvider.refreshToken', () => {
  it('talks to Pinterest, which is a copy-paste bug pinned here rather than endorsed', async () => {
    // The body, the Basic auth and the profile read are all Pinterest's, using
    // PINTEREST_CLIENT_ID and a pinterest redirect_uri. A Dribbble channel
    // cannot actually refresh through this. Pinned so the fix is visible as a
    // deliberate change to this test rather than a silent behaviour swap.
    const fetchStub = stubFetch([
      ['/v5/oauth/token', () => ({ access_token: 'a', expires_in: 3600 })],
      ['/v5/user_account', () => ({ id: '1', username: 'u', profile_image: '' })],
    ]);

    await provider.refreshToken('refresh-1');

    expect(fetchStub.urls()[0]).toContain('api-sandbox.pinterest.com');
    expect(fetchStub.urls()[1]).toContain('api-sandbox.pinterest.com');
  });
});

describe('DribbbleProvider analytics', () => {
  it('reports nothing, because Dribbble exposes no analytics api', async () => {
    await expect(provider.analytics('id', 'token', 7)).resolves.toEqual([]);
    await expect(
      provider.postAnalytics('id', 'token', 'post-1', 7)
    ).resolves.toEqual([]);
  });
});
