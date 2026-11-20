import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { createHash } from 'crypto';
import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { VkProvider } from './vk.provider';

const provider = new VkProvider();
const integration = {} as never;

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello vk',
  settings: {},
  ...over,
});

const user = () => ({
  user: {
    user_id: 77,
    first_name: 'Ada',
    last_name: 'Lovelace',
    avatar: 'https://cdn.test/me.png',
  },
});

/** VK takes multipart bodies everywhere, so assertions read the FormData. */
const form = (fetchStub: ReturnType<typeof stubFetch>, matcher: string | RegExp, nth = 0) => {
  const matches = (u: string) =>
    typeof matcher === 'string' ? u.includes(matcher) : matcher.test(u);
  return fetchStub.calls.filter((c) => matches(c.url))[nth].init.body as FormData;
};

beforeEach(() => {
  process.env.VK_ID = 'app-1';
  process.env.FRONTEND_URL = 'https://app.postiz.test';
});

describe('VkProvider identity', () => {
  it('caps a post at the VK wall limit', () => {
    expect(provider.identifier).toBe('vk');
    expect(provider.editor).toBe('normal');
    expect(provider.maxLength()).toBe(2048);
  });
});

describe('VkProvider.generateAuthUrl', () => {
  it('asks for the scopes it declares, space separated', async () => {
    const { url, state } = await provider.generateAuthUrl();
    const params = new URL(url).searchParams;

    expect(params.get('scope')!.split(' ')).toEqual(provider.scopes);
    expect(params.get('client_id')).toBe('app-1');
    expect(params.get('response_type')).toBe('code');
    expect(params.get('state')).toBe(state);
    expect(state).toHaveLength(32);
  });

  it('sends a PKCE challenge that really is the S256 hash of the verifier', async () => {
    const { url, codeVerifier } = await provider.generateAuthUrl();

    const expected = createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/=*$/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    expect(new URL(url).searchParams.get('code_challenge')).toBe(expected);
    expect(new URL(url).searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('never emits base64 padding or unsafe characters in the challenge', async () => {
    for (let i = 0; i < 5; i++) {
      const { url } = await provider.generateAuthUrl();
      const challenge = new URL(url).searchParams.get('code_challenge')!;

      expect(challenge).not.toMatch(/[=+/]/);
    }
  });

  it('routes a plain-http frontend through redirectmeto', async () => {
    process.env.FRONTEND_URL = 'http://localhost:4200';

    const { url } = await provider.generateAuthUrl();

    expect(new URL(url).searchParams.get('redirect_uri')).toBe(
      'https://redirectmeto.com/http://localhost:4200/integrations/social/vk'
    );
  });

  it('sends an https frontend straight back to itself', async () => {
    const { url } = await provider.generateAuthUrl();

    expect(new URL(url).searchParams.get('redirect_uri')).toBe(
      'https://app.postiz.test/integrations/social/vk'
    );
  });
});

describe('VkProvider.authenticate', () => {
  const authRoutes = () =>
    stubFetch([
      [
        '/oauth2/auth',
        () => ({ access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 3600 }),
      ],
      ['/oauth2/user_info', () => user()],
    ]);

  it('splits the code from the device id, which VK sends joined', async () => {
    // The frontend concatenates them with &&&& because VK's callback carries
    // a device_id the token exchange also needs.
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'the-code&&&&device-9', codeVerifier: 'v' });

    const body = form(fetchStub, '/oauth2/auth');
    expect(body.get('code')).toBe('the-code');
    expect(body.get('device_id')).toBe('device-9');
    expect(body.get('code_verifier')).toBe('v');
    expect(body.get('grant_type')).toBe('authorization_code');
  });

  it('describes the account and keeps the device id on the refresh token', async () => {
    authRoutes();

    await expect(
      provider.authenticate({ code: 'c&&&&device-9', codeVerifier: 'v' })
    ).resolves.toMatchObject({
      id: 77,
      name: 'Ada Lovelace',
      username: 'ada',
      accessToken: 'access-1',
      // The device id has to survive so a later refresh can send it again.
      refreshToken: 'refresh-1&&&&device-9',
      picture: 'https://cdn.test/me.png',
    });
  });

  it('reads the profile with the freshly issued token', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'c&&&&d', codeVerifier: 'v' });

    expect(form(fetchStub, '/oauth2/user_info').get('access_token')).toBe('access-1');
  });

  it('falls back to an empty picture when the account has none', async () => {
    stubFetch([
      ['/oauth2/auth', () => ({ access_token: 'a', refresh_token: 'r', expires_in: 1 })],
      ['/oauth2/user_info', () => ({ user: { user_id: 1, first_name: 'A', last_name: 'B' } })],
    ]);

    await expect(
      provider.authenticate({ code: 'c&&&&d', codeVerifier: 'v' })
    ).resolves.toMatchObject({ picture: '' });
  });

  it('turns the reported lifetime into seconds from now', async () => {
    authRoutes();

    const result = await provider.authenticate({ code: 'c&&&&d', codeVerifier: 'v' });

    expect((result as { expiresIn: number }).expiresIn).toBeGreaterThan(3500);
    expect((result as { expiresIn: number }).expiresIn).toBeLessThanOrEqual(3600);
  });
});

describe('VkProvider.refreshToken', () => {
  it('sends the stored device id back with the refresh', async () => {
    const fetchStub = stubFetch([
      [
        '/oauth2/auth',
        () => ({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 }),
      ],
      ['/oauth2/user_info', () => user()],
    ]);

    await expect(
      provider.refreshToken('old-refresh&&&&device-9')
    ).resolves.toMatchObject({
      accessToken: 'new-access',
      refreshToken: 'new-refresh&&&&device-9',
      id: 77,
    });

    const body = form(fetchStub, '/oauth2/auth');
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('old-refresh');
    expect(body.get('device_id')).toBe('device-9');
    expect(body.get('scope')).toBe(provider.scopes.join(' '));
  });
});

describe('VkProvider.post', () => {
  const wallRoute = () =>
    stubFetch([['/method/wall.post', () => ({ response: { post_id: 55 } })]]);

  it('posts to the wall and builds the feed permalink', async () => {
    const fetchStub = wallRoute();

    await expect(
      provider.post('77', 'token', [post() as never])
    ).resolves.toEqual([
      {
        id: 'post-1',
        postId: '55',
        releaseURL: 'https://vk.com/feed?w=wall77_55',
        status: 'completed',
      },
    ]);

    expect(form(fetchStub, '/method/wall.post').get('message')).toBe('hello vk');
  });

  it('sends no attachments field for a text-only post', async () => {
    const fetchStub = wallRoute();

    await provider.post('77', 'token', [post() as never]);

    expect(form(fetchStub, '/method/wall.post').get('attachments')).toBeNull();
  });

  it('carries the api version and token on the query string', async () => {
    const fetchStub = wallRoute();

    await provider.post('77', 'token', [post() as never]);

    expect(fetchStub.urls()[0]).toContain('v=5.251');
    expect(fetchStub.urls()[0]).toContain('access_token=token');
  });

  it('reports an undefined post id rather than throwing when VK errors', async () => {
    // VK answers 200 with an `error` object and no `response`.
    stubFetch([
      ['/method/wall.post', () => ({ error: { error_code: 15, error_msg: 'Access denied' } })],
    ]);

    const [result] = await provider.post('77', 'token', [post() as never]);

    expect(result.postId).toBe('undefined');
  });
});

describe('VkProvider.comment', () => {
  const commentRoute = () =>
    stubFetch([
      ['/method/wall.createComment', () => ({ response: { comment_id: 88 } })],
    ]);

  it('comments against the parent post and links back to the thread', async () => {
    const fetchStub = commentRoute();

    await expect(
      provider.comment(
        '77',
        '55',
        undefined,
        'token',
        [post({ id: 'c-1', message: 'a reply' }) as never],
        integration
      )
    ).resolves.toEqual([
      {
        id: 'c-1',
        postId: '88',
        releaseURL: 'https://vk.com/feed?w=wall77_55',
        status: 'completed',
      },
    ]);

    const body = form(fetchStub, '/method/wall.createComment');
    expect(body.get('message')).toBe('a reply');
    expect(body.get('post_id')).toBe('55');
  });

  it('always attaches to the root post, because VK comments do not nest', async () => {
    const fetchStub = commentRoute();

    await provider.comment(
      '77',
      '55',
      'previous-comment',
      'token',
      [post() as never],
      integration
    );

    expect(form(fetchStub, '/method/wall.createComment').get('post_id')).toBe('55');
  });

  it('sends no attachments field for a text-only comment', async () => {
    const fetchStub = commentRoute();

    await provider.comment('77', '55', undefined, 'token', [post() as never], integration);

    expect(form(fetchStub, '/method/wall.createComment').get('attachments')).toBeNull();
  });
});
