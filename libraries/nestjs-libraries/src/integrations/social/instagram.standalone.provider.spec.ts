vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { NotEnoughScopes } from '../social.abstract';
import { InstagramStandaloneProvider } from './instagram.standalone.provider';

const provider = new InstagramStandaloneProvider();
const integration = { internalId: 'ig-1', profile: 'me' } as never;

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello from the test suite',
  media: [{ path: '/a.jpg' }],
  settings: {},
  ...over,
});

const pending = (over: Record<string, unknown> = {}) => ({
  type: 'graph.instagram.com',
  postType: 'single' as const,
  containers: ['c1'],
  message: 'hello',
  ...over,
});

describe('InstagramStandaloneProvider.checkValidity', () => {
  it('requires at least one media', async () => {
    await expect(provider.checkValidity([[]], {})).resolves.toBe(
      'Should have at least one media'
    );
  });

  it('accepts a carousel larger than the business limit', async () => {
    await expect(
      provider.checkValidity(
        [Array.from({ length: 11 }, () => ({ path: '/a.jpg' }))] as never,
        {}
      )
    ).resolves.toBe(true);
  });

  it('refuses a trial reel with more than one media', async () => {
    await expect(
      provider.checkValidity(
        [[{ path: '/a.mp4' }, { path: '/b.mp4' }]] as never,
        { is_trial_reel: true }
      )
    ).resolves.toBe('Trial Reels can only have one video');
  });

  it('refuses a trial reel that is not a video', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }]] as never, {
        is_trial_reel: true,
      })
    ).resolves.toBe('Trial Reels must be a video');
  });

  it('accepts a single video trial reel', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.mp4' }]] as never, {
        is_trial_reel: true,
      })
    ).resolves.toBe(true);
  });

  it('caps the caption at the instagram limit', () => {
    expect(provider.maxLength()).toBe(2200);
  });
});

describe('InstagramStandaloneProvider.handleErrors', () => {
  it('reuses the shared instagram error classification', () => {
    expect(provider.handleErrors('2207010', 400)).toEqual({
      type: 'bad-body',
      value: 'Caption is too long',
    });
    expect(provider.handleErrors('{"error":"brand new"}', 400)).toBeUndefined();
  });
});

describe('InstagramStandaloneProvider authentication', () => {
  it('renews the long lived token and re-reads the profile', async () => {
    stubFetch([
      ['refresh_access_token', () => ({ access_token: 'renewed' })],
      [
        'me?fields=user_id',
        () => ({
          user_id: 'u1',
          name: 'Dana',
          username: 'dana',
          profile_picture_url: 'https://pic',
        }),
      ],
    ]);

    const result = await provider.refreshToken('old-token');

    expect(result).toMatchObject({
      id: 'u1',
      name: 'Dana',
      username: 'dana',
      accessToken: 'renewed',
      refreshToken: 'renewed',
      picture: 'https://pic',
    });
    expect(result.expiresIn).toBeGreaterThan(57 * 24 * 60 * 60);
  });

  it('falls back to an empty picture when instagram returns none', async () => {
    stubFetch([
      ['refresh_access_token', () => ({ access_token: 'renewed' })],
      ['me?fields=user_id', () => ({ user_id: 'u1', name: 'Dana', username: 'dana' })],
    ]);

    await expect(provider.refreshToken('old-token')).resolves.toMatchObject({
      picture: '',
    });
  });

  it('builds an instagram login url with every scope', async () => {
    vi.stubEnv('INSTAGRAM_APP_ID', 'ig-app');
    vi.stubEnv('FRONTEND_URL', 'https://app.example.com');

    const { url, state } = await provider.generateAuthUrl();

    expect(url).toContain('client_id=ig-app');
    expect(url).toContain('enable_fb_login=0');
    expect(url).toContain(encodeURIComponent(provider.scopes.join(',')));
    expect(url).toContain(`state=${state}`);
    expect(url).toContain(
      encodeURIComponent(
        'https://app.example.com/integrations/social/instagram-standalone'
      )
    );
  });

  it('routes a local frontend through the redirect helper', async () => {
    vi.stubEnv('INSTAGRAM_APP_ID', 'ig-app');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:4200');

    const { url } = await provider.generateAuthUrl();

    expect(url).toContain(
      encodeURIComponent(
        'https://redirectmeto.com/http://localhost:4200/integrations/social/instagram-standalone'
      )
    );
  });

  it('exchanges the code for a long lived token', async () => {
    const http = stubFetch([
      [
        'api.instagram.com/oauth/access_token',
        () => ({ access_token: 'short', permissions: provider.scopes.slice(0) }),
      ],
      ['grant_type=ig_exchange_token', () => ({ access_token: 'long' })],
      [
        'me?fields=user_id',
        () => ({
          user_id: 'u1',
          name: 'Dana',
          username: 'dana',
          profile_picture_url: 'https://pic',
        }),
      ],
    ]);

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: '' })
    ).resolves.toMatchObject({
      id: 'u1',
      accessToken: 'long',
      refreshToken: 'long',
      username: 'dana',
      picture: 'https://pic',
    });

    expect(
      http.urls().some((u) => u.includes('access_token=short'))
    ).toBe(true);
  });

  it('refuses a connection missing one of the required scopes', async () => {
    stubFetch([
      [
        'api.instagram.com/oauth/access_token',
        () => ({ access_token: 'short', permissions: ['instagram_business_basic'] }),
      ],
      ['grant_type=ig_exchange_token', () => ({ access_token: 'long' })],
    ]);

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: '' })
    ).rejects.toBeInstanceOf(NotEnoughScopes);
  });
});

describe('InstagramStandaloneProvider delegation to the graph domain', () => {
  it('creates containers against graph.instagram.com', async () => {
    const http = stubFetch([['/media?', () => ({ id: 'c1' })]]);

    const [response] = await provider.postPending(
      'ig-1',
      'token',
      [post()] as never,
      integration
    );

    expect(http.urls()[0]).toContain('graph.instagram.com');
    expect(response).toMatchObject({
      status: 'pending',
      pendingData: { type: 'graph.instagram.com', containers: ['c1'] },
    });
  });

  it('checks a container status through the shared implementation', async () => {
    stubFetch([
      ['fields=status_code,status', () => ({ status_code: 'FINISHED' })],
    ]);

    await expect(
      provider.checkPostStatus('token', pending(), integration)
    ).resolves.toMatchObject({ status: 'ready' });
  });

  it('publishes a container and resolves its permalink', async () => {
    const http = stubFetch([
      ['media_publish', () => ({ id: 'm1' })],
      ['fields=permalink', () => ({ permalink: 'https://instagram.test/p/m1' })],
    ]);

    await expect(
      provider.finalizePost('token', pending(), integration)
    ).resolves.toEqual({
      status: 'completed',
      postId: 'm1',
      releaseURL: 'https://instagram.test/p/m1',
    });
    expect(http.urls()[0]).toContain('graph.instagram.com');
  });

  it('drives a whole post to publication', async () => {
    stubFetch([
      ['/media?', () => ({ id: 'c1' })],
      ['fields=status_code,status', () => ({ status_code: 'FINISHED' })],
      ['media_publish', () => ({ id: 'm1' })],
      ['fields=permalink', () => ({ permalink: 'https://instagram.test/p/m1' })],
    ]);

    await expect(
      provider.post('ig-1', 'token', [post()] as never, integration)
    ).resolves.toEqual([
      {
        id: 'post-1',
        postId: 'm1',
        releaseURL: 'https://instagram.test/p/m1',
        status: 'success',
      },
    ]);
  });

  it('comments against graph.instagram.com', async () => {
    const http = stubFetch([
      ['/comments?', () => ({ id: 'cm-1' })],
      ['fields=permalink', () => ({ permalink: 'https://instagram.test/p/m1' })],
    ]);

    await expect(
      provider.comment(
        'ig-1',
        'm1',
        undefined,
        'token',
        [post({ id: 'c-post', message: 'nice' })] as never,
        integration
      )
    ).resolves.toMatchObject([{ id: 'c-post', postId: 'cm-1', status: 'success' }]);
    expect(http.urls()[0]).toContain('graph.instagram.com');
  });

  it('reads channel analytics from the standalone domain', async () => {
    const http = stubFetch([
      [
        'metric=follower_count,reach',
        () => ({
          data: [
            {
              name: 'reach',
              values: [{ value: 20, end_time: '2024-05-01T07:00:00+0000' }],
            },
          ],
        }),
      ],
      ['metric_type=total_value', () => ({ data: [] })],
    ]);

    await expect(provider.analytics('ig1', 'token', 7)).resolves.toMatchObject([
      { label: 'Reach' },
    ]);
    expect(http.urls()[0]).toContain('graph.instagram.com');
  });

  it('reads post analytics from the standalone domain', async () => {
    const http = stubFetch([
      [
        '/insights?metric=views,reach',
        () => ({ data: [{ name: 'likes', values: [{ value: 3 }] }] }),
      ],
    ]);

    await expect(
      provider.postAnalytics('ig-1', 'token', 'm1', 7)
    ).resolves.toMatchObject([{ label: 'Likes' }]);
    expect(http.urls()[0]).toContain('graph.instagram.com');
  });
});
