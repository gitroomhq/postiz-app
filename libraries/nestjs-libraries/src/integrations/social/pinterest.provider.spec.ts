vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody, RefreshToken } from '../social.abstract';
import { PinterestProvider } from './pinterest.provider';

const provider = new PinterestProvider();
const integration = { internalId: 'pin-1', profile: 'me' } as never;

const pending = (over: Record<string, unknown> = {}) => ({
  mediaId: '',
  message: 'hello from the test suite',
  settings: { board: 'board-1' },
  imagePaths: ['/a.jpg'],
  coverPath: '/a.jpg',
  ...over,
});

describe('PinterestProvider.checkValidity', () => {
  it('requires at least one media', async () => {
    await expect(provider.checkValidity([[]])).resolves.toBe('Requires at least one media');
  });

  it('caps a pin at five media items', async () => {
    const media = Array.from({ length: 6 }, (_, i) => ({ path: `/a${i}.jpg` }));

    await expect(provider.checkValidity([media])).resolves.toBe(
      'You can only have up to 5 media items'
    );
  });

  it('requires a cover image alongside a video', async () => {
    await expect(provider.checkValidity([[{ path: '/clip.mp4' }]])).resolves.toBe(
      'If posting a video you have to also include a cover image as second media'
    );
  });

  it('refuses a video with more than one cover', async () => {
    await expect(
      provider.checkValidity([[{ path: '/clip.mp4' }, { path: '/a.jpg' }, { path: '/b.jpg' }]])
    ).resolves.toBe('If posting a video you can only have two media items');
  });

  it('accepts a video with exactly one cover image', async () => {
    await expect(
      provider.checkValidity([[{ path: '/clip.mp4' }, { path: '/a.jpg' }]])
    ).resolves.toBe(true);
  });

  it('requires every image of a carousel to share one size', async () => {
    const dimensions = vi
      .spyOn<any, any>(provider as any, 'getImageDimensions')
      .mockResolvedValueOnce({ width: 100, height: 100 })
      .mockResolvedValueOnce({ width: 200, height: 200 });

    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }, { path: '/b.jpg' }]])
    ).resolves.toBe('Requires all images to have the same width and height');

    dimensions.mockRestore();
  });

  it('accepts a carousel whose images all match', async () => {
    const dimensions = vi
      .spyOn<any, any>(provider as any, 'getImageDimensions')
      .mockResolvedValue({ width: 100, height: 100 });

    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }, { path: '/b.jpg' }]])
    ).resolves.toBe(true);

    dimensions.mockRestore();
  });

  it('does not measure a single image', async () => {
    const dimensions = vi.spyOn<any, any>(provider as any, 'getImageDimensions');

    await expect(provider.checkValidity([[{ path: '/a.jpg' }]])).resolves.toBe(true);
    expect(dimensions).not.toHaveBeenCalled();

    dimensions.mockRestore();
  });
});

describe('PinterestProvider.handleErrors', () => {
  it('reports the image cap as a terminal bad body', () => {
    expect(provider.handleErrors('constraint: maxItems=5')).toEqual({
      type: 'bad-body',
      value: 'You can upload a maximum of 5 images per post on Pinterest.',
    });
  });

  it.each([
    ['could not fetch the image'],
    ['Something went wrong on our end'],
    ['Unable to reach the URL'],
  ])('marks %j retryable', (body) => {
    expect(provider.handleErrors(body)?.type).toBe('retry');
  });

  it('leaves an unrecognised body unclassified', () => {
    expect(provider.handleErrors('{"error":"brand new"}')).toBeUndefined();
  });
});

describe('PinterestProvider pending handshake', () => {
  it('is ready straight away for an image-only pin, with no status call', async () => {
    const fetch = stubFetch([]);

    await expect(provider.checkPostStatus('token', pending(), integration)).resolves.toEqual({
      status: 'ready',
      pendingData: pending(),
    });
    expect(fetch.calls).toHaveLength(0);
  });

  it('stays pending while the uploaded video is processing', async () => {
    stubFetch([['/media/m1', () => ({ status: 'processing' })]]);

    await expect(
      provider.checkPostStatus('token', pending({ mediaId: 'm1' }), integration)
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('fails terminally on a corrupt upload', async () => {
    stubFetch([['/media/m1', () => ({ status: 'failed' })]]);

    await expect(
      provider.checkPostStatus('token', pending({ mediaId: 'm1' }), integration)
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('keeps polling through a transient status-check failure', async () => {
    stubFetch([
      [
        '/media/m1',
        () => Response.json({ message: 'Something went wrong on our end' }, { status: 500 }),
      ],
    ]);

    // The upload may still finish; giving up here loses a pin that would have
    // published fine.
    await expect(
      provider.checkPostStatus('token', pending({ mediaId: 'm1' }), integration)
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('surfaces an expired token rather than polling forever', async () => {
    stubFetch([
      [
        '/media/m1',
        () => Response.json({ message: 'Authentication failed' }, { status: 401 }),
      ],
    ]);

    await expect(
      provider.checkPostStatus('token', pending({ mediaId: 'm1' }), integration)
    ).rejects.toBeInstanceOf(RefreshToken);
  });

  it('arms the create attempt without touching Pinterest', async () => {
    const fetch = stubFetch([]);

    await expect(provider.finalizePost('token', pending(), integration)).resolves.toEqual({
      status: 'pending',
      pendingData: { ...pending(), attempting: true, confirmed: false },
    });
    expect(fetch.calls).toHaveLength(0);
  });

  it('confirms the armed attempt on the next status check', async () => {
    const armed = pending({ attempting: true, confirmed: false });

    await expect(provider.checkPostStatus('token', armed, integration)).resolves.toEqual({
      status: 'ready',
      pendingData: { ...armed, confirmed: true },
    });
  });

  it('stops rather than risk a duplicate when a confirmed attempt lost its result', async () => {
    // Pinterest offers no way to ask whether the pin was created, so retrying
    // a confirmed create is how the same pin appears twice.
    await expect(
      provider.checkPostStatus(
        'token',
        pending({ attempting: true, confirmed: true }),
        integration
      )
    ).rejects.toBeInstanceOf(BadBody);
  });
});

describe('PinterestProvider.finalizePost', () => {
  const confirmed = (over: Record<string, unknown> = {}) =>
    pending({ attempting: true, confirmed: true, ...over });

  it('creates a single-image pin', async () => {
    const fetch = stubFetch([['/v5/pins', () => ({ id: 'pin-9' })]]);

    await expect(provider.finalizePost('token', confirmed(), integration)).resolves.toEqual({
      status: 'completed',
      postId: 'pin-9',
      releaseURL: 'https://www.pinterest.com/pin/pin-9',
    });

    expect(fetch.body('/v5/pins')).toMatchObject({
      description: 'hello from the test suite',
      board_id: 'board-1',
      media_source: { source_type: 'image_url', url: '/a.jpg' },
    });
  });

  it('creates a multi-image pin from every path', async () => {
    const fetch = stubFetch([['/v5/pins', () => ({ id: 'pin-9' })]]);

    await provider.finalizePost(
      'token',
      confirmed({ imagePaths: ['/a.jpg', '/b.jpg'] }),
      integration
    );

    expect(fetch.body('/v5/pins').media_source).toEqual({
      source_type: 'multiple_image_urls',
      items: [{ url: '/a.jpg' }, { url: '/b.jpg' }],
    });
  });

  it('creates a video pin against the uploaded media and its cover', async () => {
    const fetch = stubFetch([['/v5/pins', () => ({ id: 'pin-9' })]]);

    await provider.finalizePost(
      'token',
      confirmed({ mediaId: 'm1', coverPath: '/cover.jpg' }),
      integration
    );

    expect(fetch.body('/v5/pins').media_source).toEqual({
      source_type: 'video_id',
      media_id: 'm1',
      cover_image_url: '/cover.jpg',
    });
  });

  it('omits the optional settings that were left empty', async () => {
    const fetch = stubFetch([['/v5/pins', () => ({ id: 'pin-9' })]]);

    await provider.finalizePost('token', confirmed(), integration);

    const body = fetch.body('/v5/pins');
    expect(body).not.toHaveProperty('link');
    expect(body).not.toHaveProperty('title');
    expect(body).not.toHaveProperty('dominant_color');
  });

  it('passes the optional settings through when they are set', async () => {
    const fetch = stubFetch([['/v5/pins', () => ({ id: 'pin-9' })]]);

    await provider.finalizePost(
      'token',
      confirmed({
        settings: {
          board: 'board-1',
          link: 'https://example.test',
          title: 'A title',
          dominant_color: '#ffffff',
        },
      }),
      integration
    );

    expect(fetch.body('/v5/pins')).toMatchObject({
      link: 'https://example.test',
      title: 'A title',
      dominant_color: '#ffffff',
    });
  });
});

describe('PinterestProvider.refreshToken', () => {
  it('exchanges the refresh token and reads the profile back', async () => {
    const fetch = stubFetch([
      ['/oauth/token', () => ({ access_token: 'fresh', expires_in: 3600 })],
      ['/user_account', () => ({ id: 'pin-1', username: 'me', profile_image: 'https://pic.test' })],
    ]);
    vi.stubEnv('PINTEREST_CLIENT_ID', 'client');
    vi.stubEnv('PINTEREST_CLIENT_SECRET', 'secret');

    await expect(provider.refreshToken('old')).resolves.toMatchObject({
      id: 'pin-1',
      name: 'me',
      accessToken: 'fresh',
      refreshToken: 'old',
      expiresIn: 3600,
      picture: 'https://pic.test',
    });

    expect(fetch.calls[0].init.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from('client:secret').toString('base64')}`,
    });
  });
});

describe('PinterestProvider.generateAuthUrl', () => {
  it('asks for the board and pin scopes', async () => {
    vi.stubEnv('PINTEREST_CLIENT_ID', 'client');
    vi.stubEnv('FRONTEND_URL', 'https://app.test');

    const { url, state } = await provider.generateAuthUrl();

    expect(decodeURIComponent(url)).toContain(
      'boards:read,boards:write,pins:read,pins:write,user_accounts:read'
    );
    expect(url).toContain(`state=${state}`);
  });
});

describe('PinterestProvider.authenticate', () => {
  const authRoutes = (scope = provider.scopes.join(',')) =>
    stubFetch([
      [
        '/v5/oauth/token',
        () => ({
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          expires_in: 2592000,
          scope,
        }),
      ],
      [
        '/v5/user_account',
        () => ({ id: 'acct-1', username: 'apinner', profile_image: 'https://cdn.test/me.png' }),
      ],
    ]);

  beforeEach(() => {
    process.env.PINTEREST_CLIENT_ID = 'client-1';
    process.env.PINTEREST_CLIENT_SECRET = 'secret-1';
    process.env.FRONTEND_URL = 'https://app.postiz.test';
  });

  it('exchanges the code and describes the account', async () => {
    const fetchStub = authRoutes();

    await expect(
      provider.authenticate({ code: 'the-code', codeVerifier: 'v', refresh: '' })
    ).resolves.toEqual({
      id: 'acct-1',
      name: 'apinner',
      username: 'apinner',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 2592000,
      picture: 'https://cdn.test/me.png',
    });

    const body = new URLSearchParams(String(fetchStub.calls[0].init.body));
    expect(Object.fromEntries(body)).toMatchObject({
      grant_type: 'authorization_code',
      code: 'the-code',
      redirect_uri: 'https://app.postiz.test/integrations/social/pinterest',
    });
  });

  it('authenticates the exchange with basic client credentials', async () => {
    // Pinterest takes the client id and secret as HTTP basic, not in the body.
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: '' });

    expect(fetchStub.calls[0].init.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from('client-1:secret-1').toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    });
  });

  it('refuses a grant missing a scope it needs', async () => {
    authRoutes('boards:read,pins:read');

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: '' })
    ).rejects.toBeTruthy();
  });

  it('reads the account with the freshly issued token', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: '' });

    expect(fetchStub.calls[1].init.headers).toMatchObject({
      Authorization: 'Bearer access-1',
    });
  });
});

describe('PinterestProvider.boards', () => {
  it('reduces the board list to id and name', async () => {
    const fetchStub = stubFetch([
      [
        '/v5/boards',
        () => ({ items: [{ id: 'b1', name: 'Inspiration', privacy: 'PUBLIC' }] }),
      ],
    ]);

    await expect(provider.boards('token')).resolves.toEqual([
      { id: 'b1', name: 'Inspiration' },
    ]);
    // One page large enough that most accounts never need a second request.
    expect(fetchStub.urls()[0]).toContain('page_size=250');
  });

  it('returns an empty list when the account has no boards', async () => {
    stubFetch([['/v5/boards', () => ({})]]);

    await expect(provider.boards('token')).resolves.toEqual([]);
  });
});

describe('PinterestProvider.analytics', () => {
  const daily = (date: string, over: Record<string, number> = {}) => ({
    date,
    metrics: {
      PIN_CLICK_RATE: 0.5,
      IMPRESSION: 100,
      PIN_CLICK: 10,
      ENGAGEMENT: 20,
      SAVE: 5,
      ...over,
    },
  });

  it('splits the daily metrics into one series per label', async () => {
    stubFetch([
      [
        '/v5/user_account/analytics',
        () => ({ all: { daily_metrics: [daily('2026-01-01'), daily('2026-01-02')] } }),
      ],
    ]);

    const result = await provider.analytics('id', 'token', 7);

    expect(result.map((r) => r.label)).toEqual([
      'Pin click rate',
      'Impressions',
      'Pin Clicks',
      'Engagement',
      'Saves',
    ]);
    expect(result[1].data).toEqual([
      { date: '2026-01-01', total: 100 },
      { date: '2026-01-02', total: 100 },
    ]);
  });

  it('skips a day that carries no metrics at all', async () => {
    // Pinterest returns placeholder days with an empty metrics object.
    stubFetch([
      [
        '/v5/user_account/analytics',
        () => ({ all: { daily_metrics: [{ date: '2026-01-01', metrics: {} }, daily('2026-01-02')] } }),
      ],
    ]);

    const result = await provider.analytics('id', 'token', 7);

    expect(result[0].data).toEqual([{ date: '2026-01-02', total: 0.5 }]);
  });

  it('still returns the five empty series when there is no data', async () => {
    stubFetch([['/v5/user_account/analytics', () => ({ all: { daily_metrics: [] } })]]);

    const result = await provider.analytics('id', 'token', 7);

    expect(result).toHaveLength(5);
    expect(result.every((r) => r.data.length === 0)).toBe(true);
  });

  it('clamps the window to the 89 days Pinterest will serve', async () => {
    // Asking for more returns a 400, so a "last year" request has to be cut.
    const fetchStub = stubFetch([
      ['/v5/user_account/analytics', () => ({ all: { daily_metrics: [] } })],
    ]);

    await provider.analytics('id', 'token', 365);

    const params = new URL(fetchStub.urls()[0]).searchParams;
    const days =
      (Date.parse(params.get('end_date')!) - Date.parse(params.get('start_date')!)) /
      86400000;
    expect(days).toBe(89);
  });
});

describe('PinterestProvider.postAnalytics', () => {
  it('reports each lifetime metric it understands', async () => {
    stubFetch([
      [
        '/analytics',
        () => ({
          all: {
            lifetime_metrics: {
              IMPRESSION: 500,
              PIN_CLICK: 40,
              OUTBOUND_CLICK: 12,
              SAVE: 7,
            },
          },
        }),
      ],
    ]);

    const result = await provider.postAnalytics('id', 'token', 'pin-1', 7);

    expect(result.map((r) => r.label)).toEqual([
      'Impressions',
      'Pin Clicks',
      'Outbound Clicks',
      'Saves',
    ]);
    expect(result[0].data[0].total).toBe('500');
  });

  it('skips a metric Pinterest did not return', async () => {
    stubFetch([
      ['/analytics', () => ({ all: { lifetime_metrics: { IMPRESSION: 1 } } })],
    ]);

    const result = await provider.postAnalytics('id', 'token', 'pin-1', 7);

    expect(result.map((r) => r.label)).toEqual(['Impressions']);
  });

  it('reports a zero metric rather than dropping it', async () => {
    stubFetch([
      ['/analytics', () => ({ all: { lifetime_metrics: { IMPRESSION: 0 } } })],
    ]);

    const result = await provider.postAnalytics('id', 'token', 'pin-1', 7);

    expect(result[0].data[0].total).toBe('0');
  });

  it.each([
    ['there is no data at all', {}],
    ['there are no lifetime metrics', { all: {} }],
  ])('returns nothing when %s', async (_label, body) => {
    stubFetch([['/analytics', () => body]]);

    await expect(
      provider.postAnalytics('id', 'token', 'pin-1', 7)
    ).resolves.toEqual([]);
  });
});
