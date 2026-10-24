import { describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { DevToProvider } from './dev.to.provider';

const provider = new DevToProvider();
const integration = {} as never;

const API_KEY = 'devto-api-key';

const credentials = () =>
  Buffer.from(JSON.stringify({ apiKey: API_KEY })).toString('base64');

const post = (settings: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: '# Heading\n\nSome markdown.',
  settings: { title: 'A Post', ...settings },
});

describe('DevToProvider identity', () => {
  it('declares a long-form markdown editor', () => {
    expect(provider.identifier).toBe('devto');
    expect(provider.editor).toBe('markdown');
    expect(provider.maxLength()).toBe(100000);
  });

  it('asks only for an api key', async () => {
    const fields = await provider.customFields();

    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({ key: 'apiKey', type: 'password' });
  });

  it('has no oauth, so the state doubles as the url', async () => {
    const { url, state } = await provider.generateAuthUrl();

    expect(url).toBe(state);
    expect(state).toHaveLength(6);
  });

  it('returns an empty token set on refresh, because an api key does not expire', async () => {
    await expect(provider.refreshToken('x')).resolves.toMatchObject({
      accessToken: '',
      expiresIn: 0,
    });
  });
});

describe('DevToProvider.handleErrors', () => {
  it('turns a duplicate canonical url into a terminal bad-body', async () => {
    // Retrying cannot help: the canonical url is already claimed by an
    // earlier article, so the publish must fail rather than loop.
    expect(
      provider.handleErrors('{"error":"Canonical url has already been taken"}')
    ).toEqual({ type: 'bad-body', value: 'Canonical URL already exists' });
  });

  it('leaves every other error to the default handling', () => {
    expect(provider.handleErrors('{"error":"rate limit"}')).toBeUndefined();
    expect(provider.handleErrors('')).toBeUndefined();
  });
});

describe('DevToProvider.authenticate', () => {
  it('identifies the user and keeps the api key as the access token', async () => {
    const fetchStub = stubFetch([
      [
        '/api/users/me',
        () => ({
          id: 42,
          name: 'A Writer',
          username: 'awriter',
          profile_image: 'https://dev.to/avatar.png',
        }),
      ],
    ]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toMatchObject({
      id: 42,
      name: 'A Writer',
      username: 'awriter',
      accessToken: API_KEY,
      picture: 'https://dev.to/avatar.png',
    });
    expect(fetchStub.calls[0].init.headers).toMatchObject({ 'api-key': API_KEY });
  });

  it('falls back to an empty picture when there is no avatar', async () => {
    stubFetch([['/api/users/me', () => ({ id: 1, name: 'x', username: 'y' })]]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toMatchObject({ picture: '' });
  });

  it('reports invalid credentials rather than throwing when dev.to is unreachable', async () => {
    stubFetch([]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toBe('Invalid credentials');
  });

  it('reports invalid credentials when the body is not json', async () => {
    stubFetch([['/api/users/me', () => new Response('<html>nope</html>')]]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toBe('Invalid credentials');
  });

  it('issues a token that effectively never expires', async () => {
    stubFetch([['/api/users/me', () => ({ id: 1, name: 'x', username: 'y' })]]);

    const result = await provider.authenticate({
      code: credentials(),
      codeVerifier: 'v',
    });

    expect((result as { expiresIn: number }).expiresIn).toBeGreaterThan(
      90 * 365 * 24 * 60 * 60
    );
  });
});

describe('DevToProvider.tags', () => {
  it('reshapes the tag list for a select control', async () => {
    const fetchStub = stubFetch([
      [
        '/api/tags',
        () => [
          { id: 1, name: 'javascript' },
          { id: 2, name: 'testing' },
        ],
      ],
    ]);

    await expect(provider.tags(API_KEY)).resolves.toEqual([
      { value: 1, label: 'javascript' },
      { value: 2, label: 'testing' },
    ]);
    expect(fetchStub.urls()[0]).toContain('per_page=1000');
    expect(fetchStub.calls[0].init.headers).toMatchObject({ 'api-key': API_KEY });
  });

  it('returns an empty list when there are no tags', async () => {
    stubFetch([['/api/tags', () => []]]);

    await expect(provider.tags(API_KEY)).resolves.toEqual([]);
  });
});

describe('DevToProvider.organizations', () => {
  const articles = (usernames: Array<string | undefined>) =>
    usernames.map((username) => ({
      id: 1,
      organization: username ? { username } : undefined,
    }));

  it('derives the organization list from the author\'s own articles', async () => {
    const fetchStub = stubFetch([
      ['/api/articles/me/all', () => articles(['acme'])],
      [
        '/api/organizations/acme',
        () => ({ id: 7, name: 'Acme Inc', username: 'acme' }),
      ],
    ]);

    await expect(provider.organizations(API_KEY)).resolves.toEqual([
      { id: 7, name: 'Acme Inc', username: 'acme' },
    ]);
    expect(fetchStub.countTo('/api/organizations/')).toBe(1);
  });

  it('asks about each organization once however many articles mention it', async () => {
    // Every article of a prolific author carries the same organization, so
    // without the dedup this would be one request per article.
    const fetchStub = stubFetch([
      ['/api/articles/me/all', () => articles(['acme', 'acme', 'acme', 'other'])],
      [
        /organizations\/(acme|other)/,
        ({ url }) => ({ id: 1, name: 'n', username: url.split('/').pop() }),
      ],
    ]);

    await provider.organizations(API_KEY);

    expect(fetchStub.countTo('/api/organizations/')).toBe(2);
  });

  it('ignores articles published outside any organization', async () => {
    const fetchStub = stubFetch([
      ['/api/articles/me/all', () => articles([undefined, 'acme', undefined])],
      ['/api/organizations/', () => ({ id: 1, name: 'Acme', username: 'acme' })],
    ]);

    await provider.organizations(API_KEY);

    expect(fetchStub.countTo('/api/organizations/')).toBe(1);
  });

  it('returns nothing when the author has no organization articles', async () => {
    const fetchStub = stubFetch([
      ['/api/articles/me/all', () => articles([undefined, undefined])],
    ]);

    await expect(provider.organizations(API_KEY)).resolves.toEqual([]);
    expect(fetchStub.countTo('/api/organizations/')).toBe(0);
  });

  it('keeps only id, name and username from the organization detail', async () => {
    stubFetch([
      ['/api/articles/me/all', () => articles(['acme'])],
      [
        '/api/organizations/acme',
        () => ({
          id: 7,
          name: 'Acme',
          username: 'acme',
          summary: 'dropped',
          tech_stack: 'dropped',
        }),
      ],
    ]);

    const [org] = await provider.organizations(API_KEY);

    expect(Object.keys(org)).toEqual(['id', 'name', 'username']);
  });
});

describe('DevToProvider.post', () => {
  const articleRoute = (over: Record<string, unknown> = {}) =>
    stubFetch([
      [
        '/api/articles',
        () => ({ id: 99, url: 'https://dev.to/awriter/a-post-1a2b', ...over }),
      ],
    ]);

  it('publishes the markdown immediately and reports the article url', async () => {
    const fetchStub = articleRoute();

    await expect(
      provider.post('id', API_KEY, [post() as never], integration)
    ).resolves.toEqual([
      {
        id: 'post-1',
        status: 'completed',
        postId: '99',
        releaseURL: 'https://dev.to/awriter/a-post-1a2b',
      },
    ]);

    expect(fetchStub.body('/api/articles').article).toMatchObject({
      title: 'A Post',
      body_markdown: '# Heading\n\nSome markdown.',
      published: true,
    });
  });

  it('authenticates with the api key, not a bearer token', async () => {
    const fetchStub = articleRoute();

    await provider.post('id', API_KEY, [post() as never], integration);

    expect(fetchStub.calls[0].init.headers).toMatchObject({
      'api-key': API_KEY,
      'Content-Type': 'application/json',
    });
  });

  it('sends tag labels, because the api names tags rather than numbering them', async () => {
    const fetchStub = articleRoute();

    await provider.post(
      'id',
      API_KEY,
      [
        post({
          tags: [
            { value: 1, label: 'javascript' },
            { value: 2, label: 'testing' },
          ],
        }) as never,
      ],
      integration
    );

    expect(fetchStub.body('/api/articles').article.tags).toEqual([
      'javascript',
      'testing',
    ]);
  });

  it('omits the cover image and canonical url when they are not set', async () => {
    // Sending canonical_url: undefined is fine, but sending it empty would
    // claim an empty canonical and collide with the next post.
    const fetchStub = articleRoute();

    await provider.post('id', API_KEY, [post() as never], integration);

    const article = fetchStub.body('/api/articles').article;
    expect(article).not.toHaveProperty('main_image');
    expect(article).not.toHaveProperty('canonical_url');
  });

  it('includes the cover image and canonical url when they are set', async () => {
    const fetchStub = articleRoute();

    await provider.post(
      'id',
      API_KEY,
      [
        post({
          main_image: { path: 'https://cdn.test/cover.png' },
          canonical: 'https://blog.test/original',
        }) as never,
      ],
      integration
    );

    expect(fetchStub.body('/api/articles').article).toMatchObject({
      main_image: 'https://cdn.test/cover.png',
      canonical_url: 'https://blog.test/original',
    });
  });

  it('publishes under an organization when one is chosen', async () => {
    const fetchStub = articleRoute();

    await provider.post(
      'id',
      API_KEY,
      [post({ organization: 7 }) as never],
      integration
    );

    expect(fetchStub.body('/api/articles').article.organization_id).toBe(7);
  });

  it('only publishes the first post of the batch', async () => {
    const fetchStub = articleRoute();

    await provider.post(
      'id',
      API_KEY,
      [post() as never, post() as never],
      integration
    );

    expect(fetchStub.countTo('/api/articles')).toBe(1);
  });
});
