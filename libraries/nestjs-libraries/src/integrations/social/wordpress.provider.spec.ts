import { describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));
vi.mock('@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher', () => ({
  getSsrfSafeDispatcher: () => 'ssrf-dispatcher',
  ssrfSafeDispatcher: 'ssrf-dispatcher',
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { WordpressProvider } from './wordpress.provider';

const provider = new WordpressProvider();
const integration = {} as never;

const DOMAIN = 'https://blog.test';

const token = (over: Record<string, string> = {}) =>
  Buffer.from(
    JSON.stringify({
      domain: DOMAIN,
      username: 'editor',
      password: 'app pass',
      ...over,
    })
  ).toString('base64');

const BASIC = `Basic ${Buffer.from('editor:app pass').toString('base64')}`;

const post = (settings: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: '<p>the body</p>',
  settings: { type: 'posts', title: 'Hello World', ...settings },
});

describe('WordpressProvider identity', () => {
  it('declares a long-form limit and an html editor', () => {
    expect(provider.maxLength()).toBe(100000);
    expect(provider.identifier).toBe('wordpress');
    expect(provider.editor).toBe('html');
  });

  it('asks for a domain, username and password up front', async () => {
    const fields = await provider.customFields();

    expect(fields.map((f) => f.key)).toEqual(['domain', 'username', 'password']);
    expect(fields.find((f) => f.key === 'password')?.type).toBe('password');
  });

  it('uses the state itself as the auth url, because there is no oauth', async () => {
    const { url, state } = await provider.generateAuthUrl();

    expect(url).toBe(state);
  });
});

describe('WordpressProvider.handleErrors', () => {
  it('turns a permissions refusal into a terminal bad-body', async () => {
    // rest_cannot_create means the connected user lacks the capability, which
    // retrying will never fix.
    expect(provider.handleErrors('{"code":"rest_cannot_create"}')).toEqual({
      type: 'bad-body',
      value: 'The connect user has insufficient permissions to create posts',
    });
  });

  it('leaves anything else to the default handling', () => {
    expect(provider.handleErrors('{"code":"rest_no_route"}')).toBeUndefined();
    expect(provider.handleErrors('')).toBeUndefined();
  });
});

describe('WordpressProvider.authenticate', () => {
  const meRoute = (respond: () => unknown) =>
    stubFetch([['/wp-json/wp/v2/users/me', respond]]);

  it('identifies the user and keeps the credentials as the access token', async () => {
    const fetchStub = meRoute(() => ({
      id: 7,
      name: 'The Editor',
      avatar_urls: { '24': 'small.png', '96': 'big.png', '48': 'mid.png' },
    }));
    const code = token();

    const result = await provider.authenticate({ code, codeVerifier: 'v' });

    expect(result).toMatchObject({
      id: `${DOMAIN}_7`,
      name: 'The Editor',
      username: 'editor',
      accessToken: code,
      picture: 'big.png',
    });
    expect(fetchStub.urls()[0]).toBe(`${DOMAIN}/wp-json/wp/v2/users/me`);
    expect(fetchStub.calls[0].init.headers).toMatchObject({
      Authorization: BASIC,
    });
  });

  it('sends the request through the SSRF-safe dispatcher', async () => {
    // A self-hosted domain is attacker-supplied, so this is the only thing
    // stopping a connect from reaching 169.254.169.254.
    const fetchStub = meRoute(() => ({ id: 1, name: 'x', avatar_urls: {} }));

    await provider.authenticate({ code: token(), codeVerifier: 'v' });

    expect(fetchStub.calls[0].init).toMatchObject({
      dispatcher: 'ssrf-dispatcher',
    });
  });

  it.each([
    ['a trailing slash', `${DOMAIN}/`],
    ['several trailing slashes', `${DOMAIN}///`],
    ['surrounding whitespace', `  ${DOMAIN}  `],
    ['whitespace and a slash', `  ${DOMAIN}/  `],
  ])('normalises %s so the path is not doubled', async (_label, domain) => {
    const fetchStub = meRoute(() => ({ id: 1, name: 'x', avatar_urls: {} }));

    await provider.authenticate({ code: token({ domain }), codeVerifier: 'v' });

    expect(fetchStub.urls()[0]).toBe(`${DOMAIN}/wp-json/wp/v2/users/me`);
  });

  it('picks the largest avatar by its numeric key, not by string order', async () => {
    // "96" vs "24" vs "512": a string comparison would pick "96".
    meRoute(() => ({
      id: 1,
      name: 'x',
      avatar_urls: { '24': 'a.png', '96': 'b.png', '512': 'c.png' },
    }));

    await expect(
      provider.authenticate({ code: token(), codeVerifier: 'v' })
    ).resolves.toMatchObject({ picture: 'c.png' });
  });

  it('falls back to an empty picture when there are no avatars', async () => {
    meRoute(() => ({ id: 1, name: 'x' }));

    await expect(
      provider.authenticate({ code: token(), codeVerifier: 'v' })
    ).resolves.toMatchObject({ picture: '' });
  });

  it('explains an unreachable site rather than throwing', async () => {
    stubFetch([]);

    await expect(
      provider.authenticate({ code: token(), codeVerifier: 'v' })
    ).resolves.toBe(
      'Could not reach your WordPress site. Check the Domain URL and that the site is publicly accessible.'
    );
  });

  it.each([401, 403])('blames the security plugin or credentials on %i', async (status) => {
    meRoute(
      () =>
        new Response(JSON.stringify({ code: 'rest_forbidden', message: 'no' }), {
          status,
        })
    );

    await expect(
      provider.authenticate({ code: token(), codeVerifier: 'v' })
    ).resolves.toContain('WordPress rejected the login');
  });

  it('reports the status for any other failure', async () => {
    meRoute(() => new Response('<html>maintenance</html>', { status: 503 }));

    await expect(
      provider.authenticate({ code: token(), codeVerifier: 'v' })
    ).resolves.toContain('HTTP 503');
  });

  it('explains a 200 that is not JSON', async () => {
    // A security plugin or maintenance page answering 200 with HTML would
    // otherwise blow up on .json().
    meRoute(() => new Response('<html>hi</html>', { status: 200 }));

    await expect(
      provider.authenticate({ code: token(), codeVerifier: 'v' })
    ).resolves.toContain('did not return a valid response');
  });

  it('treats a REST error object on a 200 as bad credentials', async () => {
    meRoute(() => ({ code: 'rest_not_logged_in', message: 'nope' }));

    await expect(
      provider.authenticate({ code: token(), codeVerifier: 'v' })
    ).resolves.toBe('Invalid credentials');
  });

  it('issues a token that effectively never expires', async () => {
    meRoute(() => ({ id: 1, name: 'x', avatar_urls: {} }));

    const result = await provider.authenticate({ code: token(), codeVerifier: 'v' });

    expect((result as { expiresIn: number }).expiresIn).toBeGreaterThan(
      90 * 365 * 24 * 60 * 60
    );
  });
});

describe('WordpressProvider taxonomy tools', () => {
  it('keeps only public post types, dropping internal ones', async () => {
    const fetchStub = stubFetch([
      [
        '/wp-json/wp/v2/types',
        () => ({
          post: { rest_base: 'posts', name: 'Posts' },
          page: { rest_base: 'pages', name: 'Pages' },
          attachment: { rest_base: 'media', name: 'Media' },
          wp_block: { rest_base: 'blocks', name: 'Blocks' },
          nav_menu_item: { rest_base: 'menu-items', name: 'Menu Items' },
        }),
      ],
    ]);

    await expect(provider.postTypes(token())).resolves.toEqual([
      { id: 'posts', name: 'Posts' },
      { id: 'pages', name: 'Pages' },
    ]);
    expect(fetchStub.calls[0].init).toMatchObject({ dispatcher: 'ssrf-dispatcher' });
  });

  it('reduces categories and tags to id and name', async () => {
    stubFetch([
      ['/categories', () => [{ id: 1, name: 'News', count: 9 }]],
      ['/tags', () => [{ id: 5, name: 'release', count: 2 }]],
    ]);

    await expect(provider.categoriesList(token())).resolves.toEqual([
      { id: 1, name: 'News' },
    ]);
    await expect(provider.tagsList(token())).resolves.toEqual([
      { id: 5, name: 'release' },
    ]);
  });

  it.each([
    ['an error object', { code: 'rest_no_route' }],
    ['null', null],
  ])('returns an empty list when categories answers %s', async (_label, body) => {
    // WordPress answers a REST error as an object, and mapping over it would
    // throw where an empty list is the honest answer.
    stubFetch([['/categories', () => body]]);

    await expect(provider.categoriesList(token())).resolves.toEqual([]);
  });

  it('asks for a full page of taxonomy terms', async () => {
    const fetchStub = stubFetch([['/categories', () => []]]);

    await provider.categoriesList(token());

    expect(fetchStub.urls()[0]).toContain('per_page=100');
  });
});

describe('WordpressProvider.post', () => {
  const publishRoutes = (over: Record<string, unknown> = {}) =>
    stubFetch([
      [
        '/wp-json/wp/v2/posts',
        () => ({ id: 42, link: `${DOMAIN}/hello-world`, ...over }),
      ],
    ]);

  it('publishes to the configured post type with a slugified title', async () => {
    const fetchStub = publishRoutes();

    const [result] = await provider.post(
      'id',
      token(),
      [post() as never],
      integration
    );

    expect(fetchStub.urls()[0]).toBe(`${DOMAIN}/wp-json/wp/v2/posts`);
    expect(fetchStub.body('/wp-json/wp/v2/posts')).toMatchObject({
      title: 'Hello World',
      content: '<p>the body</p>',
      slug: 'hello-world',
      status: 'publish',
    });
    expect(result).toEqual({
      id: 'post-1',
      status: 'completed',
      postId: '42',
      releaseURL: `${DOMAIN}/hello-world`,
    });
  });

  it('honours a custom post type', async () => {
    const fetchStub = stubFetch([['/wp-json/wp/v2/portfolio', () => ({ id: 1, link: 'l' })]]);

    await provider.post('id', token(), [post({ type: 'portfolio' }) as never], integration);

    expect(fetchStub.urls()[0]).toBe(`${DOMAIN}/wp-json/wp/v2/portfolio`);
  });

  it('honours a draft status instead of forcing publish', async () => {
    const fetchStub = publishRoutes();

    await provider.post('id', token(), [post({ status: 'draft' }) as never], integration);

    expect(fetchStub.body('/wp-json/wp/v2/posts').status).toBe('draft');
  });

  it.each([
    ['A Título: Ünicode & Symbols!', 'a-titulo-unicode-and-symbols'],
    ['   spaced   out   ', 'spaced-out'],
  ])('slugifies %s', async (title, slug) => {
    const fetchStub = publishRoutes();

    await provider.post('id', token(), [post({ title }) as never], integration);

    expect(fetchStub.body('/wp-json/wp/v2/posts').slug).toBe(slug);
  });

  it('sends numeric categories and tags, discarding anything unparseable', async () => {
    const fetchStub = publishRoutes();

    await provider.post(
      'id',
      token(),
      [post({ categories: ['1', '2', 'not-a-number'], tags: ['7', 'nope'] }) as never],
      integration
    );

    expect(fetchStub.body('/wp-json/wp/v2/posts')).toMatchObject({
      categories: [1, 2],
      tags: [7],
    });
  });

  it('omits categories and tags entirely when there are none', async () => {
    // Sending [] would clear the post's terms rather than leave them alone.
    const fetchStub = publishRoutes();

    await provider.post('id', token(), [post() as never], integration);

    const body = fetchStub.body('/wp-json/wp/v2/posts');
    expect(body).not.toHaveProperty('categories');
    expect(body).not.toHaveProperty('tags');
    expect(body).not.toHaveProperty('featured_media');
  });

  it('uploads a featured image first and attaches it to the post', async () => {
    const fetchStub = stubFetch([
      ['https://cdn.test/hero.png', () => new Response('bytes', {
        headers: { 'content-type': 'image/png' },
      })],
      ['/wp-json/wp/v2/media', () => ({ id: 99 })],
      ['/wp-json/wp/v2/posts', () => ({ id: 42, link: 'l' })],
    ]);

    await provider.post(
      'id',
      token(),
      [post({ main_image: { path: 'https://cdn.test/hero.png' } }) as never],
      integration
    );

    expect(fetchStub.urls()).toEqual([
      'https://cdn.test/hero.png',
      `${DOMAIN}/wp-json/wp/v2/media`,
      `${DOMAIN}/wp-json/wp/v2/posts`,
    ]);
    expect(fetchStub.calls[1].init.headers).toMatchObject({
      Authorization: BASIC,
      'Content-Disposition': 'attachment; filename="hero.png"',
    });
    expect(fetchStub.body('/wp-json/wp/v2/posts').featured_media).toBe(99);
  });

  it('authenticates every call with the stored application password', async () => {
    const fetchStub = publishRoutes();

    await provider.post('id', token(), [post() as never], integration);

    expect(fetchStub.calls[0].init.headers).toMatchObject({
      Authorization: BASIC,
      'Content-Type': 'application/json',
    });
  });
});
