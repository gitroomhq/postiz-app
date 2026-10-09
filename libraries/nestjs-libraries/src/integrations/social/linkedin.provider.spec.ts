import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody, RefreshToken } from '../social.abstract';
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


const integration = { internalId: 'li-1', profile: 'me' } as never;

const pending = (over: Record<string, unknown> = {}) => ({
  authorId: 'li-1',
  postType: 'personal' as const,
  message: 'hello from the test suite',
  isPdf: false,
  mediaIds: [],
  poll: [],
  graceChecks: 0,
  ...over,
});

describe('LinkedinProvider.checkValidity', () => {
  const provider = new LinkedinProvider();

  it('requires two images for a carousel', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }]], { post_as_images_carousel: true })
    ).resolves.toBe('Carousel can only be created with 2 or more images and no videos.');
  });

  it('refuses a video inside a carousel', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }, { path: '/clip.mp4' }]], {
        post_as_images_carousel: true,
      })
    ).resolves.toBe('Carousel can only be created with 2 or more images and no videos.');
  });

  it('accepts a two-image carousel', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }, { path: '/b.jpg' }]], {
        post_as_images_carousel: true,
      })
    ).resolves.toBe(true);
  });

  it('allows only one media alongside a video', async () => {
    await expect(
      provider.checkValidity([[{ path: '/clip.mp4' }, { path: '/a.jpg' }]], {})
    ).resolves.toBe('Can have maximum 1 media when selecting a video.');
  });

  it('refuses media on a comment', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }], [{ path: '/b.jpg' }]], {})
    ).resolves.toBe('Comments can only contain text.');
  });

  it('accepts a text-only comment', async () => {
    await expect(provider.checkValidity([[{ path: '/a.jpg' }], []], {})).resolves.toBe(true);
  });
});

describe('LinkedinProvider pending handshake', () => {
  const provider = new LinkedinProvider();

  it('is ready straight away when there is nothing to wait for', async () => {
    await expect(provider.checkPostStatus('token', pending(), integration)).resolves.toEqual({
      status: 'ready',
      pendingData: { ...pending(), poll: [] },
    });
  });

  it('keeps polling a media that is still processing', async () => {
    stubFetch([['/rest/videos/', () => ({ status: 'PROCESSING' })]]);

    await expect(
      provider.checkPostStatus(
        'token',
        pending({ poll: [{ urn: 'urn:li:video:1', endpoint: 'videos' }] }),
        integration
      )
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('is ready once every media is available', async () => {
    stubFetch([['/rest/videos/', () => ({ status: 'AVAILABLE' })]]);

    await expect(
      provider.checkPostStatus(
        'token',
        pending({ poll: [{ urn: 'urn:li:video:1', endpoint: 'videos' }] }),
        integration
      )
    ).resolves.toMatchObject({ status: 'ready', pendingData: { poll: [] } });
  });

  it('names the media type when LinkedIn rejects it', async () => {
    stubFetch([
      [
        '/rest/videos/',
        () => ({ status: 'PROCESSING_FAILED', processingFailureReason: 'BAD_CODEC' }),
      ],
    ]);

    const error = await provider
      .checkPostStatus(
        'token',
        pending({ poll: [{ urn: 'urn:li:video:1', endpoint: 'videos' }] }),
        integration
      )
      .catch((e) => e);

    expect(error).toBeInstanceOf(BadBody);
    expect(error.message).toBe('LinkedIn video processing failed: BAD_CODEC');
  });

  it('counts a status read with no status field as a stall rather than polling forever', async () => {
    stubFetch([['/rest/videos/', () => ({})]]);

    await expect(
      provider.checkPostStatus(
        'token',
        pending({ poll: [{ urn: 'urn:li:video:1', endpoint: 'videos' }] }),
        integration
      )
    ).resolves.toMatchObject({ status: 'pending', pendingData: { statusStalls: 1 } });
  });

  it('gives up with an accurate message once the status check keeps failing', async () => {
    stubFetch([['/rest/videos/', () => Response.json({ message: 'boom' }, { status: 500 })]]);

    // Nothing was published at this point, so saying so is the honest report.
    const error = await provider
      .checkPostStatus(
        'token',
        pending({ poll: [{ urn: 'urn:li:video:1', endpoint: 'videos' }], statusStalls: 10 }),
        integration
      )
      .catch((e) => e);

    expect(error).toBeInstanceOf(BadBody);
    expect(error.message).toContain('nothing was published');
  });

  it('surfaces an expired token instead of counting it as a stall', async () => {
    stubFetch([
      ['/rest/videos/', () => Response.json({ message: 'Unauthorized' }, { status: 401 })],
    ]);

    await expect(
      provider.checkPostStatus(
        'token',
        pending({ poll: [{ urn: 'urn:li:video:1', endpoint: 'videos' }] }),
        integration
      )
    ).rejects.toBeInstanceOf(RefreshToken);
  });

  it('burns the grace cycles for media LinkedIn cannot be polled about', async () => {
    // Personal images and documents are write-only endpoints, so there is no
    // status to read - only time to wait.
    await expect(
      provider.checkPostStatus('token', pending({ graceChecks: 2 }), integration)
    ).resolves.toMatchObject({ status: 'pending', pendingData: { graceChecks: 1 } });
  });

  it('arms the create attempt without touching LinkedIn', async () => {
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
    // LinkedIn offers no way to ask whether the post was created.
    await expect(
      provider.checkPostStatus(
        'token',
        pending({ attempting: true, confirmed: true }),
        integration
      )
    ).rejects.toBeInstanceOf(BadBody);
  });
});

describe('LinkedinProvider.finalizePost', () => {
  const provider = new LinkedinProvider();
  const confirmed = (over: Record<string, unknown> = {}) =>
    pending({ attempting: true, confirmed: true, ...over });

  const created = (id = 'urn:li:share:1') =>
    new Response('{}', { status: 201, headers: { 'x-restli-id': id } });

  it('creates a text post as the person and returns its feed url', async () => {
    const fetch = stubFetch([['/rest/posts', () => created()]]);

    await expect(provider.finalizePost('token', confirmed(), integration)).resolves.toEqual({
      status: 'completed',
      postId: 'urn:li:share:1',
      releaseURL: 'https://www.linkedin.com/feed/update/urn:li:share:1',
    });

    expect(fetch.body('/rest/posts')).toMatchObject({
      author: 'urn:li:person:li-1',
      visibility: 'PUBLIC',
      lifecycleState: 'PUBLISHED',
    });
  });

  it('creates a company post as the organization', async () => {
    const fetch = stubFetch([['/rest/posts', () => created()]]);

    await provider.finalizePost('token', confirmed({ postType: 'company' }), integration);

    expect(fetch.body('/rest/posts').author).toBe('urn:li:organization:li-1');
  });

  it('attaches a single media directly', async () => {
    const fetch = stubFetch([['/rest/posts', () => created()]]);

    await provider.finalizePost('token', confirmed({ mediaIds: ['urn:li:image:1'] }), integration);

    expect(fetch.body('/rest/posts').content).toEqual({ media: { id: 'urn:li:image:1' } });
  });

  it('attaches several media as a multi-image post', async () => {
    const fetch = stubFetch([['/rest/posts', () => created()]]);

    await provider.finalizePost(
      'token',
      confirmed({ mediaIds: ['urn:li:image:1', 'urn:li:image:2'] }),
      integration
    );

    expect(fetch.body('/rest/posts').content).toEqual({
      multiImage: { images: [{ id: 'urn:li:image:1' }, { id: 'urn:li:image:2' }] },
    });
  });

  it('titles a carousel document with the name the user chose', async () => {
    const fetch = stubFetch([['/rest/posts', () => created()]]);

    await provider.finalizePost(
      'token',
      confirmed({ mediaIds: ['urn:li:document:1'], isPdf: true, pdfTitle: 'My deck' }),
      integration
    );

    expect(fetch.body('/rest/posts').content.media).toEqual({
      title: 'My deck',
      id: 'urn:li:document:1',
    });
  });

  it('drops the empty media ids the upload step left behind', async () => {
    const fetch = stubFetch([['/rest/posts', () => created()]]);

    await provider.finalizePost(
      'token',
      confirmed({ mediaIds: ['urn:li:image:1', '', null] }),
      integration
    );

    expect(fetch.body('/rest/posts').content).toEqual({ media: { id: 'urn:li:image:1' } });
  });

  it('fails when LinkedIn answers the create with anything but a success', async () => {
    stubFetch([['/rest/posts', () => new Response('{}', { status: 202 })]]);

    await expect(
      provider.finalizePost('token', confirmed(), integration)
    ).rejects.toBeInstanceOf(BadBody);
  });
});

describe('LinkedinProvider text escaping', () => {
  const provider = new LinkedinProvider();

  it('escapes the characters LinkedIn treats as little-text markup', async () => {
    const fetch = stubFetch([
      ['/rest/posts', () => new Response('{}', { status: 201, headers: { 'x-restli-id': 'p' } })],
    ]);

    await provider.finalizePost(
      'token',
      pending({ attempting: true, confirmed: true, message: 'a #tag (x) [y] *z*' }),
      integration
    );

    expect(fetch.body('/rest/posts').commentary).toBe(
      'a \\#tag \\(x\\) \\[y\\] \\*z\\*'
    );
  });

  it('leaves an organization mention intact', async () => {
    const fetch = stubFetch([
      ['/rest/posts', () => new Response('{}', { status: 201, headers: { 'x-restli-id': 'p' } })],
    ]);

    // Escaping the mention would post the raw urn instead of a linked company.
    await provider.finalizePost(
      'token',
      pending({
        attempting: true,
        confirmed: true,
        message: 'hi @[Postiz](urn:li:organization:1) there',
      }),
      integration
    );

    expect(fetch.body('/rest/posts').commentary).toContain('@[Postiz](urn:li:organization:1)');
  });
});

describe('LinkedinProvider.generateAuthUrl', () => {
  const provider = new LinkedinProvider();

  it('asks for every scope it declares, space separated', async () => {
    process.env.LINKEDIN_CLIENT_ID = 'client-1';
    process.env.FRONTEND_URL = 'https://app.postiz.test';

    const { url, state, codeVerifier } = await provider.generateAuthUrl();
    const params = new URL(url).searchParams;

    expect(params.get('scope')!.split(' ')).toEqual(provider.scopes);
    expect(params.get('client_id')).toBe('client-1');
    expect(params.get('state')).toBe(state);
    expect(params.get('response_type')).toBe('code');
    expect(params.get('redirect_uri')).toBe(
      'https://app.postiz.test/integrations/social/linkedin'
    );
    expect(codeVerifier).toHaveLength(30);
  });

  it('suppresses the consent screen on a reconnect', async () => {
    const { url } = await provider.generateAuthUrl();

    expect(new URL(url).searchParams.get('prompt')).toBe('none');
  });
});

describe('LinkedinProvider.authenticate', () => {
  const provider = new LinkedinProvider();

  const authRoutes = (scope = provider.scopes.join(',')) =>
    stubFetch([
      [
        '/oauth/v2/accessToken',
        () => ({
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          expires_in: 5184000,
          scope,
        }),
      ],
      [
        '/v2/userinfo',
        () => ({ sub: 'member-1', name: 'A Member', picture: 'https://cdn.test/p.png' }),
      ],
      ['/v2/me', () => ({ vanityName: 'a-member' })],
    ]);

  beforeEach(() => {
    process.env.LINKEDIN_CLIENT_ID = 'client-1';
    process.env.LINKEDIN_CLIENT_SECRET = 'secret-1';
    process.env.FRONTEND_URL = 'https://app.postiz.test';
  });

  it('exchanges the code and describes the member', async () => {
    authRoutes();

    await expect(
      provider.authenticate({ code: 'the-code', codeVerifier: 'v' })
    ).resolves.toEqual({
      id: 'member-1',
      name: 'A Member',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 5184000,
      picture: 'https://cdn.test/p.png',
      username: 'a-member',
    });
  });

  it('posts the exchange as form data, not json', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'the-code', codeVerifier: 'v' });

    const body = new URLSearchParams(String(fetchStub.calls[0].init.body));
    expect(Object.fromEntries(body)).toMatchObject({
      grant_type: 'authorization_code',
      code: 'the-code',
      client_id: 'client-1',
      client_secret: 'secret-1',
      redirect_uri: 'https://app.postiz.test/integrations/social/linkedin',
    });
  });

  it('appends the refresh marker to the redirect when reconnecting', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: 'int-9' });

    const body = new URLSearchParams(String(fetchStub.calls[0].init.body));
    expect(body.get('redirect_uri')).toBe(
      'https://app.postiz.test/integrations/social/linkedin?refresh=int-9'
    );
  });

  it('refuses a grant missing a scope it needs', async () => {
    authRoutes('openid,profile');

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).rejects.toBeTruthy();
  });

  it('accepts a space separated scope list too', async () => {
    // LinkedIn has answered with both separators; checkScopes handles either.
    authRoutes(provider.scopes.join(' '));

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).resolves.toMatchObject({ id: 'member-1' });
  });

  it('authorizes the profile reads with the freshly issued token', async () => {
    const fetchStub = authRoutes();

    await provider.authenticate({ code: 'c', codeVerifier: 'v' });

    expect(fetchStub.calls[1].init.headers).toMatchObject({
      Authorization: 'Bearer access-1',
    });
    expect(fetchStub.calls[2].init.headers).toMatchObject({
      Authorization: 'Bearer access-1',
    });
  });
});

describe('LinkedinProvider.company', () => {
  const provider = new LinkedinProvider();

  it('resolves a company url to a mention token', async () => {
    const fetchStub = stubFetch([
      [
        '/v2/organizations',
        () => ({ elements: [{ id: 42, localizedName: 'Acme Inc' }] }),
      ],
    ]);

    await expect(
      provider.company('token', { url: 'https://www.linkedin.com/company/acme' })
    ).resolves.toEqual({
      options: {
        label: 'Acme Inc',
        value: '@[Acme Inc](urn:li:organization:42)',
      },
    });
    expect(fetchStub.urls()[0]).toContain('vanityName=acme');
  });

  it.each([
    ['without www', 'https://linkedin.com/company/acme'],
    ['with a trailing slash', 'https://www.linkedin.com/company/acme/'],
    ['over plain http', 'http://linkedin.com/company/acme'],
  ])('accepts a url %s', async (_label, url) => {
    const fetchStub = stubFetch([
      ['/v2/organizations', () => ({ elements: [{ id: 1, localizedName: 'Acme' }] })],
    ]);

    await provider.company('token', { url });

    expect(fetchStub.urls()[0]).toContain('vanityName=acme');
  });

  it.each([
    ['a personal profile', 'https://www.linkedin.com/in/someone'],
    ['a bare domain', 'https://www.linkedin.com'],
    ['a nested company path', 'https://www.linkedin.com/company/acme/about'],
    ['not a url at all', 'acme'],
  ])('rejects %s before calling LinkedIn', async (_label, url) => {
    const fetchStub = stubFetch([]);

    await expect(provider.company('token', { url })).rejects.toThrow(
      'Invalid LinkedIn company URL'
    );
    expect(fetchStub.calls).toHaveLength(0);
  });

  it('sends the versioned Restli headers LinkedIn requires', async () => {
    const fetchStub = stubFetch([
      ['/v2/organizations', () => ({ elements: [{ id: 1, localizedName: 'A' }] })],
    ]);

    await provider.company('token', { url: 'https://www.linkedin.com/company/acme' });

    expect(fetchStub.calls[0].init.headers).toMatchObject({
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202601',
      Authorization: 'Bearer token',
    });
  });

  it('reports nothing found as an undefined option rather than throwing', async () => {
    stubFetch([['/v2/organizations', () => ({ elements: [] })]]);

    await expect(
      provider.company('token', { url: 'https://www.linkedin.com/company/nope' })
    ).resolves.toEqual({ options: undefined });
  });
});

describe('LinkedinProvider.mention', () => {
  const provider = new LinkedinProvider();

  it('reshapes an organization search for the mention picker', async () => {
    stubFetch([
      [
        '/v2/organizations',
        () => ({
          elements: [
            {
              id: 42,
              localizedName: 'Acme Inc',
              logoV2: {
                'original~': {
                  elements: [{ identifiers: [{ identifier: 'https://cdn.test/logo.png' }] }],
                },
              },
            },
          ],
        }),
      ],
    ]);

    await expect(provider.mention('token', { query: 'acme' })).resolves.toEqual([
      { id: '42', label: 'Acme Inc', image: 'https://cdn.test/logo.png' },
    ]);
  });

  it('falls back to an empty image when there is no logo', async () => {
    stubFetch([
      ['/v2/organizations', () => ({ elements: [{ id: 1, localizedName: 'A' }] })],
    ]);

    await expect(provider.mention('token', { query: 'a' })).resolves.toEqual([
      { id: '1', label: 'A', image: '' },
    ]);
  });

  it('url-encodes the query', async () => {
    const fetchStub = stubFetch([['/v2/organizations', () => ({ elements: [] })]]);

    await provider.mention('token', { query: 'a company & co' });

    expect(fetchStub.urls()[0]).toContain('vanityName=a%20company%20%26%20co');
  });

  it('formats a mention as the urn LinkedIn expects', () => {
    expect(provider.mentionFormat('42', 'Acme Inc')).toBe(
      '@[Acme Inc](urn:li:organization:42)'
    );
  });

  it('strips a leading @ so the name is not doubled up', () => {
    expect(provider.mentionFormat('42', '@Acme')).toBe(
      '@[Acme](urn:li:organization:42)'
    );
  });
});

describe('LinkedinProvider.repostPostUsers', () => {
  const provider = new LinkedinProvider();

  const integration = { internalId: 'member-1', token: 'token-1' } as never;

  it('reshares as a person for a personal channel', async () => {
    const fetchStub = stubFetch([['/rest/posts', () => ({ id: 'urn:li:share:1' })]]);

    await provider.repostPostUsers(integration, integration, 'urn:li:share:99', {});

    expect(fetchStub.body('/rest/posts')).toMatchObject({
      author: 'urn:li:person:member-1',
      lifecycleState: 'PUBLISHED',
      visibility: 'PUBLIC',
      reshareContext: { parent: 'urn:li:share:99' },
    });
  });

  it('reshares as an organization for a page channel', async () => {
    const fetchStub = stubFetch([['/rest/posts', () => ({ id: 'urn:li:share:1' })]]);

    await provider.repostPostUsers(integration, integration, 'urn:li:share:99', {}, false);

    expect(fetchStub.body('/rest/posts').author).toBe('urn:li:organization:member-1');
  });

  it('sends an empty commentary, because a reshare adds no text of its own', async () => {
    const fetchStub = stubFetch([['/rest/posts', () => ({})]]);

    await provider.repostPostUsers(integration, integration, 'urn:li:share:99', {});

    expect(fetchStub.body('/rest/posts').commentary).toBe('');
  });
});
