// this.fetch sleeps 5s between retries; never let real time into a unit test.
vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody, RefreshToken } from '../social.abstract';
import { FacebookProvider } from './facebook.provider';

const provider = new FacebookProvider();
const integration = { internalId: 'page-1' } as never;

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello from the test suite',
  media: [],
  settings: {},
  ...over,
});

describe('FacebookProvider.handleErrors', () => {
  it.each([
    ['Error validating access token', 'Please re-authenticate your Facebook account'],
    ['{"error":"REVOKED_ACCESS_TOKEN"}', 'Access token has been revoked, please re-authenticate'],
    ['{"error_subcode":1404078}', 'Page publishing authorization required, please re-authenticate'],
  ])('asks for a reconnect on %j', (body, value) => {
    expect(provider.handleErrors(body, 400)).toEqual({ type: 'refresh-token', value });
  });

  it.each([
    ['{"error_subcode":1366046}', 'Photos should be smaller than 4 MB and saved as JPG, PNG'],
    ['{"error_subcode":1390008}', 'You are posting too fast, please slow down'],
    ['{"error_subcode":1346003}', 'Content flagged as abusive by Facebook'],
    ['{"error_subcode":1404102}', 'Content violates Facebook Community Standards'],
    ['{"error_subcode":2069019}', 'Invalid file'],
  ])('reports %j as a terminal bad body', (body, value) => {
    expect(provider.handleErrors(body, 400)).toEqual({ type: 'bad-body', value });
  });

  it('leaves an unrecognised body unclassified so the generic handling applies', () => {
    expect(provider.handleErrors('{"error":"something new"}', 400)).toBeUndefined();
  });
});

describe('FacebookProvider.checkValidity', () => {
  it('requires media for a story', async () => {
    await expect(provider.checkValidity([[]], { post_type: 'story' })).resolves.toBe(
      'Story should have at least one media'
    );
  });

  it('accepts a story that has media', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }]], { post_type: 'story' })
    ).resolves.toBe(true);
  });

  it('accepts a text-only feed post', async () => {
    await expect(provider.checkValidity([[]], {})).resolves.toBe(true);
  });
});

describe('FacebookProvider feed posts', () => {
  it('publishes a text-only post to the page feed', async () => {
    const fetch = stubFetch([['/feed', () => ({ id: 'p1', permalink_url: 'https://fb.test/p1' })]]);

    await expect(
      provider.post('page-1', 'token', [post()] as never, integration)
    ).resolves.toEqual([
      { id: 'post-1', postId: 'p1', releaseURL: 'https://fb.test/p1', status: 'success' },
    ]);

    expect(fetch.body('/feed')).toEqual({
      message: 'hello from the test suite',
      published: true,
    });
  });

  it('uploads each image unpublished and attaches them to one feed post', async () => {
    let photo = 0;
    const fetch = stubFetch([
      ['/photos', () => ({ id: `photo-${++photo}` })],
      ['/feed', () => ({ id: 'p1', permalink_url: 'https://fb.test/p1' })],
    ]);

    await provider.post(
      'page-1',
      'token',
      [post({ media: [{ path: '/a.jpg' }, { path: '/b.jpg' }] })] as never,
      integration
    );

    // Publishing each photo separately would post three times, not once.
    expect(fetch.body('/photos', 0)).toEqual({ url: '/a.jpg', published: false });
    expect(fetch.body('/feed').attached_media).toEqual([
      { media_fbid: 'photo-1' },
      { media_fbid: 'photo-2' },
    ]);
  });

  it('publishes an mp4 as a reel and returns the reel url', async () => {
    stubFetch([['/videos', () => ({ id: 'v1', permalink_url: 'ignored' })]]);

    await expect(
      provider.post('page-1', 'token', [post({ media: [{ path: '/clip.mp4' }] })] as never, integration)
    ).resolves.toEqual([
      {
        id: 'post-1',
        postId: 'v1',
        releaseURL: 'https://www.facebook.com/reel/v1',
        status: 'success',
      },
    ]);
  });

  it('attaches a link when the settings carry one', async () => {
    const fetch = stubFetch([['/feed', () => ({ id: 'p1', permalink_url: 'u' })]]);

    await provider.post(
      'page-1',
      'token',
      [post({ settings: { url: 'https://example.test' } })] as never,
      integration
    );

    expect(fetch.body('/feed').link).toBe('https://example.test');
  });
});

describe('FacebookProvider background presets', () => {
  const withPreset = post({ settings: { text_format_preset_id: 'preset-1' } });

  it('applies the preset to a short text-only post', async () => {
    const fetch = stubFetch([['/feed', () => ({ id: 'p1', permalink_url: 'u' })]]);

    await provider.post('page-1', 'token', [withPreset] as never, integration);

    expect(fetch.body('/feed').text_format_preset_id).toBe('preset-1');
  });

  it('drops the preset once media is attached, where Facebook does not allow it', async () => {
    const fetch = stubFetch([
      ['/photos', () => ({ id: 'photo-1' })],
      ['/feed', () => ({ id: 'p1', permalink_url: 'u' })],
    ]);

    await provider.post(
      'page-1',
      'token',
      [post({ media: [{ path: '/a.jpg' }], settings: { text_format_preset_id: 'preset-1' } })] as never,
      integration
    );

    expect(fetch.body('/feed').text_format_preset_id).toBeUndefined();
  });

  it('drops the preset for a message past the background character cap', async () => {
    const fetch = stubFetch([['/feed', () => ({ id: 'p1', permalink_url: 'u' })]]);

    await provider.post(
      'page-1',
      'token',
      [post({ message: 'x'.repeat(200), settings: { text_format_preset_id: 'preset-1' } })] as never,
      integration
    );

    expect(fetch.body('/feed').text_format_preset_id).toBeUndefined();
  });

  it('republishes without the preset when Facebook rejects a retired background', async () => {
    let attempt = 0;
    const fetch = stubFetch([
      [
        '/feed',
        () =>
          attempt++ === 0
            ? Response.json(
                { error: { code: 100, message: 'Invalid text_format_preset_id' } },
                { status: 400 }
              )
            : { id: 'p1', permalink_url: 'https://fb.test/p1' },
      ],
    ]);

    // Facebook retires backgrounds silently; losing the whole post over a
    // stale preset is worse than losing the background.
    await expect(
      provider.post('page-1', 'token', [withPreset] as never, integration)
    ).resolves.toMatchObject([{ postId: 'p1', status: 'success' }]);

    expect(fetch.countTo('/feed')).toBe(2);
    expect(fetch.body('/feed', 1).text_format_preset_id).toBeUndefined();
  });

  it('does not retry without the preset on a token error', async () => {
    stubFetch([
      [
        '/feed',
        () =>
          Response.json(
            { error: { code: 190, message: 'Error validating access token' } },
            { status: 400 }
          ),
      ],
    ]);

    // Dropping the background cannot fix an expired token, and retrying would
    // hide the real reason the channel needs reconnecting.
    await expect(
      provider.post('page-1', 'token', [withPreset] as never, integration)
    ).rejects.toBeInstanceOf(RefreshToken);
  });
});

describe('FacebookProvider story publishing', () => {
  const storyPost = post({
    media: [{ path: '/a.jpg' }, { path: '/b.jpg' }],
    settings: { post_type: 'story' },
  });

  it('uploads every story item unpublished and reports pending', async () => {
    let photo = 0;
    stubFetch([['/photos', () => ({ id: `photo-${++photo}` })]]);

    const [response] = await provider.postPending(
      'page-1',
      'token',
      [storyPost] as never,
      integration
    );

    // Uploads are invisible until the publish call, so a failure here can
    // never leave a half-published story on the page.
    expect(response).toMatchObject({
      status: 'pending',
      pendingData: {
        postType: 'story',
        publishedCount: 0,
        items: [
          { kind: 'photo', mediaId: 'photo-1' },
          { kind: 'photo', mediaId: 'photo-2' },
        ],
      },
    });
  });

  it('starts a resumable upload for a video story', async () => {
    const fetch = stubFetch([
      ['upload_phase=start', () => ({ video_id: 'v1', upload_url: 'https://upload.test/v1' })],
      ['upload.test', () => ({})],
    ]);

    const [response] = await provider.postPending(
      'page-1',
      'token',
      [post({ media: [{ path: '/clip.mp4' }], settings: { post_type: 'story' } })] as never,
      integration
    );

    expect((response as { pendingData: { items: unknown[] } }).pendingData.items).toEqual([
      { kind: 'video', mediaId: 'v1' },
    ]);
    expect(fetch.calls[1].init.headers).toMatchObject({ file_url: '/clip.mp4' });
  });

  it('arms a publish attempt before touching anything', async () => {
    const pendingData = {
      postType: 'story' as const,
      items: [{ kind: 'photo' as const, mediaId: 'photo-1' }],
      publishedCount: 0,
      lastPostId: '',
    };

    await expect(provider.finalizePost('token', pendingData, integration)).resolves.toEqual({
      status: 'pending',
      pendingData: { ...pendingData, attempting: 0, confirmed: false },
    });
  });

  it('confirms the armed attempt on the next status check', async () => {
    const pendingData = {
      postType: 'story' as const,
      items: [{ kind: 'photo' as const, mediaId: 'photo-1' }],
      publishedCount: 0,
      lastPostId: '',
      attempting: 0,
      confirmed: false,
    };

    await expect(provider.checkPostStatus('token', pendingData, integration)).resolves.toEqual({
      status: 'ready',
      pendingData: { ...pendingData, confirmed: true },
    });
  });

  it('publishes exactly one story per finalize call', async () => {
    const fetch = stubFetch([['photo_stories', () => ({ post_id: 'story-1' })]]);

    const result = await provider.finalizePost(
      'token',
      {
        postType: 'story',
        items: [
          { kind: 'photo', mediaId: 'photo-1' },
          { kind: 'photo', mediaId: 'photo-2' },
        ],
        publishedCount: 0,
        lastPostId: '',
        attempting: 0,
        confirmed: true,
      },
      integration
    );

    expect(fetch.countTo('photo_stories')).toBe(1);
    expect(result).toEqual({
      status: 'pending',
      pendingData: expect.objectContaining({
        publishedCount: 1,
        lastPostId: 'story-1',
        attempting: null,
        confirmed: false,
      }),
    });
  });

  it('completes once the last story item is published', async () => {
    stubFetch([['photo_stories', () => ({ post_id: 'story-2' })]]);

    await expect(
      provider.finalizePost(
        'token',
        {
          postType: 'story',
          items: [{ kind: 'photo', mediaId: 'photo-1' }],
          publishedCount: 0,
          lastPostId: '',
          attempting: 0,
          confirmed: true,
        },
        integration
      )
    ).resolves.toEqual({
      status: 'completed',
      postId: 'story-2',
      releaseURL: 'https://www.facebook.com/stories/story-2',
    });
  });

  it('stops rather than risk a duplicate when a confirmed attempt lost its result', async () => {
    // Facebook has no API to ask whether a story was published, so retrying a
    // confirmed attempt is how the same story ends up on the page twice.
    await expect(
      provider.checkPostStatus(
        'token',
        {
          postType: 'story',
          items: [{ kind: 'photo', mediaId: 'photo-1' }],
          publishedCount: 0,
          lastPostId: '',
          attempting: 0,
          confirmed: true,
        },
        integration
      )
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('stays pending while a video story is still processing', async () => {
    stubFetch([['photo-1', () => ({ status: { video_status: 'processing' } })]]);

    await expect(
      provider.checkPostStatus(
        'token',
        {
          postType: 'story',
          items: [{ kind: 'video', mediaId: 'photo-1' }],
          publishedCount: 0,
          lastPostId: '',
        },
        integration
      )
    ).resolves.toMatchObject({ status: 'pending' });
  });
});

describe('FacebookProvider.comment', () => {
  it('replies to the post when there is no previous comment', async () => {
    const fetch = stubFetch([['/comments', () => ({ id: 'c1', permalink_url: 'u' })]]);

    await provider.comment('page-1', 'p1', undefined, 'token', [post()] as never, integration);

    expect(fetch.urls()[0]).toContain('/p1/comments');
  });

  it('threads onto the previous comment when there is one', async () => {
    const fetch = stubFetch([['/comments', () => ({ id: 'c2', permalink_url: 'u' })]]);

    await provider.comment('page-1', 'p1', 'c1', 'token', [post()] as never, integration);

    expect(fetch.urls()[0]).toContain('/c1/comments');
  });

  it('attaches the first media of a comment', async () => {
    const fetch = stubFetch([['/comments', () => ({ id: 'c1', permalink_url: 'u' })]]);

    await provider.comment(
      'page-1',
      'p1',
      undefined,
      'token',
      [post({ media: [{ path: '/a.jpg' }] })] as never,
      integration
    );

    expect(fetch.body('/comments').attachment_url).toBe('/a.jpg');
  });
});

describe('FacebookProvider.generateAuthUrl', () => {
  it('asks for every scope the provider declares', async () => {
    vi.stubEnv('FACEBOOK_APP_ID', 'app-1');
    vi.stubEnv('FRONTEND_URL', 'https://app.test');

    const { url, state, codeVerifier } = await provider.generateAuthUrl();

    // A missing scope only fails later, at connect time, with a confusing
    // "not enough scopes" error.
    for (const scope of provider.scopes) {
      expect(url).toContain(scope);
    }
    expect(url).toContain('client_id=app-1');
    expect(url).toContain(encodeURIComponent('https://app.test/integrations/social/facebook'));
    expect(url).toContain(`state=${state}`);
    expect(codeVerifier).toHaveLength(10);
  });
});

describe('FacebookProvider.refreshToken', () => {
  it('returns empty credentials, because Facebook long-lived tokens are not refreshable', async () => {
    await expect(provider.refreshToken('anything')).resolves.toEqual({
      refreshToken: '',
      expiresIn: 0,
      accessToken: '',
      id: '',
      name: '',
      picture: '',
      username: '',
    });
  });
});

const GRAPH = 'https://graph.facebook.com/v25.0';

const granted = (scopes: string[]) =>
  scopes.map((permission) => ({ permission, status: 'granted' }));

const page = (over: Record<string, unknown> = {}) => ({
  id: 'page-1',
  name: 'My Page',
  username: 'mypage',
  access_token: 'page-token',
  picture: { data: { url: 'https://cdn.test/pic.png' } },
  ...over,
});

describe('FacebookProvider.authenticate', () => {
  const authRoutes = (over: { permissions?: string[] } = {}) =>
    stubFetch([
      ['grant_type=fb_exchange_token', () => ({ access_token: 'long-lived' })],
      ['/oauth/access_token', () => ({ access_token: 'short-lived' })],
      [
        '/me/permissions',
        () => ({ data: granted(over.permissions ?? provider.scopes) }),
      ],
      [
        '/me?fields=id,name,picture',
        () => ({
          id: 'user-1',
          name: 'A User',
          picture: { data: { url: 'https://cdn.test/me.png' } },
        }),
      ],
    ]);

  it('exchanges the code, then trades it for a long-lived token', async () => {
    // The short-lived token expires in about an hour; only the exchanged one
    // is worth storing on the channel.
    const fetchStub = authRoutes();

    await expect(
      provider.authenticate({ code: 'the-code', codeVerifier: 'v' })
    ).resolves.toMatchObject({
      id: 'user-1',
      name: 'A User',
      accessToken: 'long-lived',
      refreshToken: 'long-lived',
      picture: 'https://cdn.test/me.png',
    });

    expect(fetchStub.urls()[0]).toContain('code=the-code');
    expect(fetchStub.urls()[1]).toContain('fb_exchange_token=short-lived');
  });

  it('appends the refresh marker to the redirect when reconnecting', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: 'int-9' });

    expect(decodeURIComponent(fetchStub.urls()[0])).toContain(
      '/integrations/social/facebook?refresh=int-9'
    );
  });

  it('refuses a grant that is missing a permission it needs', async () => {
    // Facebook lets the user untick individual permissions in the dialog, and
    // the failure would otherwise surface much later as a publish error.
    authRoutes({ permissions: ['pages_show_list', 'pages_manage_posts'] });

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).rejects.toBeTruthy();
  });

  it('ignores a permission that was declined rather than granted', async () => {
    stubFetch([
      ['grant_type=fb_exchange_token', () => ({ access_token: 'long-lived' })],
      ['/oauth/access_token', () => ({ access_token: 'short' })],
      [
        '/me/permissions',
        () => ({
          data: [
            ...granted(provider.scopes.filter((s) => s !== 'read_insights')),
            { permission: 'read_insights', status: 'declined' },
          ],
        }),
      ],
      ['/me?fields=', () => ({ id: 'u', name: 'n' })],
    ]);

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).rejects.toBeTruthy();
  });

  it('falls back to an empty picture when the account has none', async () => {
    stubFetch([
      ['grant_type=fb_exchange_token', () => ({ access_token: 'long-lived' })],
      ['/oauth/access_token', () => ({ access_token: 'short' })],
      ['/me/permissions', () => ({ data: granted(provider.scopes) })],
      ['/me?fields=', () => ({ id: 'u', name: 'n' })],
    ]);

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).resolves.toMatchObject({ picture: '', username: '' });
  });

  it('issues a token just under Facebook\'s 60 day limit', async () => {
    authRoutes();

    const result = await provider.authenticate({ code: 'c', codeVerifier: 'v' });

    const days = (result as { expiresIn: number }).expiresIn / 86400;
    expect(days).toBeGreaterThan(58);
    expect(days).toBeLessThan(60);
  });
});

describe('FacebookProvider.pages', () => {
  it('lists the pages shared during the OAuth dialog', async () => {
    stubFetch([
      ['/me/accounts', () => ({ data: [page(), page({ id: 'page-2' })] })],
      ['/me/businesses', () => ({ data: [] })],
    ]);

    await expect(provider.pages('token')).resolves.toHaveLength(2);
  });

  it('follows pagination until there is no next link', async () => {
    let call = 0;
    stubFetch([
      [
        '/me/accounts',
        () =>
          call++ === 0
            ? { data: [page()], paging: { next: `${GRAPH}/me/accounts?after=2` } }
            : { data: [page({ id: 'page-2' })] },
      ],
      ['/me/businesses', () => ({ data: [] })],
    ]);

    await expect(provider.pages('token')).resolves.toHaveLength(2);
  });

  it('also discovers pages owned through Business Manager', async () => {
    stubFetch([
      ['/me/accounts', () => ({ data: [] })],
      ['/me/businesses', () => ({ data: [{ id: 'biz-1' }] })],
      ['/owned_pages', () => ({ data: [page({ id: 'owned-1' })] })],
      ['/client_pages', () => ({ data: [page({ id: 'client-1' })] })],
    ]);

    const result = await provider.pages('token');

    expect(result.map((p: any) => p.id)).toEqual(['owned-1', 'client-1']);
  });

  it('returns a page once even when several sources list it', async () => {
    // A page reachable via both /me/accounts and Business Manager would
    // otherwise appear two or three times in the connect dialog.
    stubFetch([
      ['/me/accounts', () => ({ data: [page()] })],
      ['/me/businesses', () => ({ data: [{ id: 'biz-1' }] })],
      ['/owned_pages', () => ({ data: [page()] })],
      ['/client_pages', () => ({ data: [page()] })],
    ]);

    await expect(provider.pages('token')).resolves.toHaveLength(1);
  });

  it('still returns the OAuth pages when Business Manager is unavailable', async () => {
    // Most personal accounts have no Business Manager at all.
    stubFetch([
      ['/me/accounts', () => ({ data: [page()] })],
      ['/me/businesses', () => new Response('nope', { status: 403 })],
    ]);

    await expect(provider.pages('token')).resolves.toHaveLength(1);
  });

  it('carries on with other businesses when one of them fails', async () => {
    stubFetch([
      ['/me/accounts', () => ({ data: [] })],
      ['/me/businesses', () => ({ data: [{ id: 'biz-1' }, { id: 'biz-2' }] })],
      [
        /biz-1\/owned_pages/,
        () => {
          throw new Error('no access');
        },
      ],
      [/biz-2\/owned_pages/, () => ({ data: [page({ id: 'owned-2' })] })],
      ['/client_pages', () => ({ data: [] })],
    ]);

    const result = await provider.pages('token');

    expect(result.map((p: any) => p.id)).toEqual(['owned-2']);
  });

  it('returns an empty list when the account has no pages', async () => {
    stubFetch([
      ['/me/accounts', () => ({ data: [] })],
      ['/me/businesses', () => ({ data: [] })],
    ]);

    await expect(provider.pages('token')).resolves.toEqual([]);
  });
});

describe('FacebookProvider.fetchPageInformation', () => {
  it('finds the page in the OAuth accounts and reshapes it', async () => {
    const fetchStub = stubFetch([['/me/accounts', () => ({ data: [page()] })]]);

    await expect(
      provider.fetchPageInformation('token', { page: 'page-1' })
    ).resolves.toEqual({
      id: 'page-1',
      name: 'My Page',
      access_token: 'page-token',
      picture: 'https://cdn.test/pic.png',
      username: 'mypage',
    });
    // Found immediately, so Business Manager is never consulted.
    expect(fetchStub.countTo('/me/businesses')).toBe(0);
  });

  it('compares ids as strings, because the graph api mixes the two', async () => {
    stubFetch([['/me/accounts', () => ({ data: [page({ id: 12345 })] })]]);

    await expect(
      provider.fetchPageInformation('token', { page: '12345' })
    ).resolves.toMatchObject({ id: 12345 });
  });

  it('pages through the accounts list looking for it', async () => {
    let call = 0;
    stubFetch([
      [
        '/me/accounts',
        () =>
          call++ === 0
            ? { data: [page({ id: 'other' })], paging: { next: `${GRAPH}/me/accounts?after=2` } }
            : { data: [page()] },
      ],
    ]);

    await expect(
      provider.fetchPageInformation('token', { page: 'page-1' })
    ).resolves.toMatchObject({ id: 'page-1' });
  });

  it('falls through to Business Manager owned pages', async () => {
    stubFetch([
      ['/me/accounts', () => ({ data: [] })],
      ['/me/businesses', () => ({ data: [{ id: 'biz-1' }] })],
      ['/owned_pages', () => ({ data: [page()] })],
    ]);

    await expect(
      provider.fetchPageInformation('token', { page: 'page-1' })
    ).resolves.toMatchObject({ id: 'page-1', access_token: 'page-token' });
  });

  it('falls through again to client pages', async () => {
    stubFetch([
      ['/me/accounts', () => ({ data: [] })],
      ['/me/businesses', () => ({ data: [{ id: 'biz-1' }] })],
      ['/owned_pages', () => ({ data: [] })],
      ['/client_pages', () => ({ data: [page()] })],
    ]);

    await expect(
      provider.fetchPageInformation('token', { page: 'page-1' })
    ).resolves.toMatchObject({ id: 'page-1' });
  });

  it('says so plainly when the page is nowhere to be found', async () => {
    stubFetch([
      ['/me/accounts', () => ({ data: [page({ id: 'other' })] })],
      ['/me/businesses', () => ({ data: [] })],
    ]);

    await expect(
      provider.fetchPageInformation('token', { page: 'page-1' })
    ).rejects.toThrow('Page not found in your accounts');
  });

  it('defaults a missing picture to an empty string', async () => {
    stubFetch([
      ['/me/accounts', () => ({ data: [page({ picture: undefined })] })],
    ]);

    await expect(
      provider.fetchPageInformation('token', { page: 'page-1' })
    ).resolves.toMatchObject({ picture: '' });
  });
});

describe('FacebookProvider.reConnect', () => {
  it('re-reads the page and swaps in its current page token', async () => {
    // Page access tokens rotate; reconnecting has to pick up the new one.
    stubFetch([
      ['/me/accounts', () => ({ data: [page({ access_token: 'rotated-token' })] })],
    ]);

    await expect(provider.reConnect('old', 'page-1', 'token')).resolves.toEqual({
      id: 'page-1',
      name: 'My Page',
      accessToken: 'rotated-token',
      picture: 'https://cdn.test/pic.png',
      username: 'mypage',
    });
  });
});
