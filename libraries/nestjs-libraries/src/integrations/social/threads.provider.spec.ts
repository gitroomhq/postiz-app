vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody } from '../social.abstract';
import { ThreadsProvider } from './threads.provider';

const provider = new ThreadsProvider();
const integration = { internalId: 'user-1', profile: 'me' } as never;

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello from the test suite',
  media: [],
  settings: {},
  ...over,
});

describe('ThreadsProvider.handleErrors', () => {
  it('asks for a reconnect on an expired token', () => {
    expect(provider.handleErrors('Error validating access token')).toEqual({
      type: 'refresh-token',
      value: 'Threads access token expired',
    });
  });

  it.each([
    ['{"error_subcode":2207051}', 'Error from Meta: We restrict certain activity to protect our community'],
    ['{"error_subcode":4279013}', 'User restricted'],
    [
      'The media could not be fetched from this URI',
      "One of the media URLs is invalid or inaccessible, make sure it's being uploaded to Postiz first",
    ],
    ['text must be at most 500 characters', 'Post text exceeds 500 characters limit'],
  ])('reports %j as a terminal bad body', (body, value) => {
    expect(provider.handleErrors(body)).toEqual({ type: 'bad-body', value });
  });

  it('leaves an unrecognised body unclassified', () => {
    expect(provider.handleErrors('{"error":"brand new"}')).toBeUndefined();
  });
});

describe('ThreadsProvider container creation', () => {
  it('creates one text container and publishes nothing yet', async () => {
    const fetch = stubFetch([['/threads', () => ({ id: 'c1' })]]);

    const [response] = await provider.postPending('user-1', 'token', [post()] as never, integration);

    expect(response).toMatchObject({
      status: 'pending',
      pendingData: { step: 'container', containerId: 'c1' },
    });
    expect(fetch.calls[0].init.method).toBe('POST');
  });

  it('creates an image container for a single media post', async () => {
    const fetch = stubFetch([['/threads?', () => ({ id: 'c1' })]]);

    await provider.postPending(
      'user-1',
      'token',
      [post({ media: [{ path: '/a.jpg' }] })] as never,
      integration
    );

    expect(fetch.urls()[0]).toContain('media_type=IMAGE');
    expect(fetch.urls()[0]).toContain('image_url=');
    expect(fetch.urls()[0]).not.toContain('is_carousel_item');
  });

  it('creates a video container for an mp4', async () => {
    const fetch = stubFetch([['/threads?', () => ({ id: 'c1' })]]);

    await provider.postPending(
      'user-1',
      'token',
      [post({ media: [{ path: '/clip.mp4' }] })] as never,
      integration
    );

    expect(fetch.urls()[0]).toContain('media_type=VIDEO');
    expect(fetch.urls()[0]).toContain('video_url=');
  });

  it('creates only the children for a carousel, not the carousel itself', async () => {
    let n = 0;
    const fetch = stubFetch([['/threads?', () => ({ id: `c${++n}` })]]);

    const [response] = await provider.postPending(
      'user-1',
      'token',
      [post({ media: [{ path: '/a.jpg' }, { path: '/b.jpg' }] })] as never,
      integration
    );

    expect(fetch.urls().every((u) => u.includes('is_carousel_item=true'))).toBe(true);
    expect(response).toMatchObject({
      pendingData: { step: 'children', childIds: ['c1', 'c2'] },
    });
  });

  it('returns nothing for an empty post list', async () => {
    await expect(provider.postPending('user-1', 'token', [], integration)).resolves.toEqual([]);
  });
});

describe('ThreadsProvider.checkPostStatus', () => {
  it('stays pending while any carousel child is still processing', async () => {
    stubFetch([
      ['/c1?', () => ({ status: 'FINISHED' })],
      ['/c2?', () => ({ status: 'IN_PROGRESS' })],
    ]);

    await expect(
      provider.checkPostStatus('token', { step: 'children', childIds: ['c1', 'c2'] }, integration)
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('is ready once every carousel child finished', async () => {
    stubFetch([[/\/c[12]\?/, () => ({ status: 'FINISHED' })]]);

    await expect(
      provider.checkPostStatus('token', { step: 'children', childIds: ['c1', 'c2'] }, integration)
    ).resolves.toMatchObject({ status: 'ready' });
  });

  it('stays pending while the container is processing', async () => {
    stubFetch([['/c1?', () => ({ status: 'IN_PROGRESS' })]]);

    await expect(
      provider.checkPostStatus('token', { step: 'container', containerId: 'c1' }, integration)
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('completes rather than publishing again when the container is already live', async () => {
    stubFetch([['/c1?', () => ({ status: 'PUBLISHED' })]]);

    await expect(
      provider.checkPostStatus('token', { step: 'container', containerId: 'c1' }, integration)
    ).resolves.toEqual({
      status: 'completed',
      postId: 'c1',
      releaseURL: 'https://www.threads.net/@me',
    });
  });

  it('fails terminally when Threads could not process the media', async () => {
    stubFetch([['/c1?', () => ({ status: 'ERROR', error_message: 'Unsupported format' })]]);

    await expect(
      provider.checkPostStatus('token', { step: 'container', containerId: 'c1' }, integration)
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('fails terminally on an expired container', async () => {
    stubFetch([['/c1?', () => ({ status: 'EXPIRED' })]]);

    await expect(
      provider.checkPostStatus('token', { step: 'container', containerId: 'c1' }, integration)
    ).rejects.toBeInstanceOf(BadBody);
  });
});

describe('ThreadsProvider.finalizePost', () => {
  it('creates the carousel container from the processed children', async () => {
    const fetch = stubFetch([['/threads?', () => ({ id: 'carousel-1' })]]);

    await expect(
      provider.finalizePost(
        'token',
        { step: 'children', childIds: ['c1', 'c2'], message: 'hello' },
        integration
      )
    ).resolves.toEqual({
      status: 'pending',
      pendingData: { step: 'container', containerId: 'carousel-1' },
    });

    expect(decodeURIComponent(fetch.urls()[0])).toContain('children=c1,c2');
    expect(fetch.urls()[0]).toContain('media_type=CAROUSEL');
  });

  it('publishes the container and resolves its permalink', async () => {
    const fetch = stubFetch([
      ['threads_publish', () => ({ id: 't1' })],
      ['fields=id,permalink', () => ({ permalink: 'https://threads.net/@me/post/t1' })],
    ]);

    await expect(
      provider.finalizePost('token', { step: 'container', containerId: 'c1' }, integration)
    ).resolves.toEqual({
      status: 'completed',
      postId: 't1',
      releaseURL: 'https://threads.net/@me/post/t1',
    });

    expect(fetch.urls()[0]).toContain('creation_id=c1');
  });

  it('falls back to the profile url rather than failing a live post over a permalink', async () => {
    stubFetch([
      ['threads_publish', () => ({ id: 't1' })],
      [
        'fields=id,permalink',
        () => {
          throw new Error('permalink unavailable');
        },
      ],
    ]);

    // The post is already on Threads at this point; throwing here would make
    // the workflow retry and publish it a second time.
    await expect(
      provider.finalizePost('token', { step: 'container', containerId: 'c1' }, integration)
    ).resolves.toMatchObject({
      status: 'completed',
      releaseURL: 'https://www.threads.net/@me',
    });
  });
});

describe('ThreadsProvider.refreshToken', () => {
  it('exchanges the long-lived token and reads the profile back', async () => {
    stubFetch([
      ['refresh_access_token', () => ({ access_token: 'fresh' })],
      [
        '/me?',
        () => ({ id: 'user-1', username: 'me', threads_profile_picture_url: 'https://pic.test' }),
      ],
    ]);

    await expect(provider.refreshToken('old')).resolves.toMatchObject({
      id: 'user-1',
      name: 'me',
      accessToken: 'fresh',
      refreshToken: 'fresh',
      picture: 'https://pic.test',
    });
  });
});

describe('ThreadsProvider.generateAuthUrl', () => {
  it('routes a plain-http development frontend through redirectmeto', async () => {
    vi.stubEnv('THREADS_APP_ID', 'app-1');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:4200');

    const { url } = await provider.generateAuthUrl();

    // Threads refuses a non-https redirect_uri, which makes local development
    // impossible without the proxy.
    expect(decodeURIComponent(url)).toContain('https://redirectmeto.com/http://localhost:4200');
  });

  it('uses the frontend url directly when it is already https', async () => {
    vi.stubEnv('THREADS_APP_ID', 'app-1');
    vi.stubEnv('FRONTEND_URL', 'https://app.test');

    const { url } = await provider.generateAuthUrl();

    expect(decodeURIComponent(url)).toContain('https://app.test/integrations/social/threads');
    expect(url).not.toContain('redirectmeto');
  });
});

const userInfo = () => ({
  id: 'user-1',
  username: 'me',
  threads_profile_picture_url: 'https://cdn.test/me.png',
});

describe('ThreadsProvider.authenticate', () => {
  const authRoutes = () =>
    stubFetch([
      ['grant_type=th_exchange_token', () => ({ access_token: 'long-lived' })],
      ['/oauth/access_token', () => ({ access_token: 'short-lived' })],
      ['/v1.0/me?fields=', () => userInfo()],
    ]);

  beforeEach(() => {
    process.env.THREADS_APP_ID = 'app-1';
    process.env.THREADS_APP_SECRET = 'secret-1';
    process.env.FRONTEND_URL = 'https://app.postiz.test';
  });

  it('exchanges the code, then trades it for a long-lived token', async () => {
    const fetchStub = authRoutes();

    await expect(
      provider.authenticate({ code: 'the-code', codeVerifier: 'v' })
    ).resolves.toMatchObject({
      id: 'user-1',
      name: 'me',
      username: 'me',
      accessToken: 'long-lived',
      refreshToken: 'long-lived',
      picture: 'https://cdn.test/me.png',
    });

    expect(fetchStub.urls()[0]).toContain('code=the-code');
    expect(fetchStub.urls()[1]).toContain('access_token=short-lived');
  });

  it('issues a token just under the 60 day limit', async () => {
    authRoutes();

    const result = await provider.authenticate({ code: 'c', codeVerifier: 'v' });

    const days = (result as { expiresIn: number }).expiresIn / 86400;
    expect(days).toBeGreaterThan(57);
    expect(days).toBeLessThan(59);
  });

  it('falls back to an empty picture when the profile has none', async () => {
    stubFetch([
      ['grant_type=th_exchange_token', () => ({ access_token: 'long' })],
      ['/oauth/access_token', () => ({ access_token: 'short' })],
      ['/v1.0/me?fields=', () => ({ id: 'u', username: 'n' })],
    ]);

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).resolves.toMatchObject({ picture: '' });
  });
});

describe('ThreadsProvider.refreshToken', () => {
  it('trades the old token for a new one and re-reads the profile', async () => {
    const fetchStub = stubFetch([
      ['/refresh_access_token', () => ({ access_token: 'refreshed' })],
      ['/v1.0/me?fields=', () => userInfo()],
    ]);

    await expect(provider.refreshToken('old-token')).resolves.toMatchObject({
      id: 'user-1',
      accessToken: 'refreshed',
      refreshToken: 'refreshed',
      picture: 'https://cdn.test/me.png',
    });
    expect(fetchStub.urls()[0]).toContain('grant_type=th_refresh_token');
    expect(fetchStub.urls()[0]).toContain('access_token=old-token');
  });
});

describe('ThreadsProvider.generateAuthUrl redirect', () => {
  it('routes a plain-http frontend through redirectmeto', async () => {
    // Threads refuses to register an http:// redirect, so local development
    // bounces through redirectmeto.com.
    process.env.FRONTEND_URL = 'http://localhost:4200';

    const { url } = await provider.generateAuthUrl();

    expect(decodeURIComponent(new URL(url).searchParams.get('redirect_uri')!)).toBe(
      'https://redirectmeto.com/http://localhost:4200/integrations/social/threads'
    );
  });

  it('sends an https frontend straight back to itself', async () => {
    process.env.FRONTEND_URL = 'https://app.postiz.test';

    const { url } = await provider.generateAuthUrl();

    expect(new URL(url).searchParams.get('redirect_uri')).toBe(
      'https://app.postiz.test/integrations/social/threads'
    );
  });

  it('asks for every scope it declares', async () => {
    const { url } = await provider.generateAuthUrl();

    expect(new URL(url).searchParams.get('scope')!.split(',')).toEqual(
      provider.scopes
    );
  });
});

describe('ThreadsProvider.analytics', () => {
  it('reads a total_value metric as a single point for today', async () => {
    stubFetch([
      [
        '/threads_insights',
        () => ({ data: [{ name: 'views', total_value: { value: 1234 } }] }),
      ],
    ]);

    const [metric] = await provider.analytics('user-1', 'token', 7);

    expect(metric.label).toBe('Views');
    expect(metric.data).toHaveLength(1);
    expect(metric.data[0].total).toBe(1234);
  });

  it('expands a time series metric into one point per day', async () => {
    stubFetch([
      [
        '/threads_insights',
        () => ({
          data: [
            {
              name: 'likes',
              values: [
                { value: 3, end_time: '2026-01-01T00:00:00+0000' },
                { value: 5, end_time: '2026-01-02T00:00:00+0000' },
              ],
            },
          ],
        }),
      ],
    ]);

    const [metric] = await provider.analytics('user-1', 'token', 7);

    expect(metric.label).toBe('Likes');
    expect(metric.data.map((d) => d.total)).toEqual([3, 5]);
  });

  it('returns nothing when the account has no insights', async () => {
    stubFetch([['/threads_insights', () => ({})]]);

    await expect(provider.analytics('user-1', 'token', 7)).resolves.toEqual([]);
  });

  it('asks for the window the caller requested', async () => {
    const fetchStub = stubFetch([['/threads_insights', () => ({ data: [] })]]);

    await provider.analytics('user-1', 'token', 30);

    const url = fetchStub.urls()[0];
    const since = Number(new URL(url).searchParams.get('since'));
    const until = Number(new URL(url).searchParams.get('until'));
    expect((until - since) / 86400).toBeGreaterThan(29);
  });
});

describe('ThreadsProvider.postAnalytics', () => {
  it('labels each metric it understands', async () => {
    stubFetch([
      [
        '/insights?metric=views',
        () => ({
          data: [
            { name: 'views', values: [{ value: 10 }] },
            { name: 'likes', values: [{ value: 2 }] },
            { name: 'replies', total_value: { value: 1 } },
            { name: 'reposts', values: [{ value: 4 }] },
            { name: 'quotes', values: [{ value: 5 }] },
          ],
        }),
      ],
    ]);

    const result = await provider.postAnalytics('user-1', 'token', 'post-1', 7);

    expect(result.map((r) => r.label)).toEqual([
      'Views',
      'Likes',
      'Replies',
      'Reposts',
      'Quotes',
    ]);
  });

  it('skips a metric that carries no value at all', async () => {
    stubFetch([
      [
        '/insights?metric=views',
        () => ({ data: [{ name: 'views', values: [{ value: 10 }] }, { name: 'likes' }] }),
      ],
    ]);

    const result = await provider.postAnalytics('user-1', 'token', 'post-1', 7);

    expect(result.map((r) => r.label)).toEqual(['Views']);
  });

  it('returns nothing when there are no insights', async () => {
    stubFetch([['/insights?metric=views', () => ({ data: [] })]]);

    await expect(
      provider.postAnalytics('user-1', 'token', 'post-1', 7)
    ).resolves.toEqual([]);
  });
});

describe('ThreadsProvider.autoPlugPost', () => {
  const plugIntegration = { internalId: 'user-1', token: 'token-1' } as never;

  const likes = (value: number) => ({
    data: [{ name: 'likes', values: [{ value }] }],
  });

  it('replies and publishes once the like threshold is reached', async () => {
    const fetchStub = stubFetch([
      ['/insights?metric=likes', () => likes(50)],
      ['/me/threads', () => ({ id: 'container-1' })],
      ['/threads_publish', () => ({ id: 'published-1' })],
    ]);

    await expect(
      provider.autoPlugPost(plugIntegration, 'post-1', {
        likesAmount: '10',
        post: '<p>Check out my course</p>',
      })
    ).resolves.toBe(true);

    expect(fetchStub.countTo('/threads_publish')).toBe(1);
    expect(fetchStub.urls().at(-1)).toContain('creation_id=container-1');
  });

  it('strips the html from the plug before sending it', async () => {
    const fetchStub = stubFetch([
      ['/insights?metric=likes', () => likes(50)],
      ['/me/threads', () => ({ id: 'c' })],
      ['/threads_publish', () => ({ id: 'p' })],
    ]);

    await provider.autoPlugPost(plugIntegration, 'post-1', {
      likesAmount: '10',
      post: '<p>Plain please</p>',
    });

    const form = fetchStub.calls.find((c) => c.url.includes('/me/threads'))!
      .init.body as FormData;
    expect(form.get('text')).not.toContain('<p>');
    expect(form.get('media_type')).toBe('TEXT');
    expect(form.get('reply_to_id')).toBe('post-1');
  });

  it('does nothing below the threshold', async () => {
    const fetchStub = stubFetch([['/insights?metric=likes', () => likes(2)]]);

    await expect(
      provider.autoPlugPost(plugIntegration, 'post-1', {
        likesAmount: '10',
        post: 'hello',
      })
    ).resolves.toBe(false);
    expect(fetchStub.countTo('/me/threads')).toBe(0);
  });
});
