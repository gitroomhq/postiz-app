import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { HashnodeProvider } from './hashnode.provider';

const provider = new HashnodeProvider();
const integration = {} as never;

const API_KEY = 'hashnode-api-key';

const credentials = () =>
  Buffer.from(JSON.stringify({ apiKey: API_KEY })).toString('base64');

const post = (settings: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: '# Heading\n\nSome markdown.',
  settings: { title: 'A Post', publication: 'pub-1', tags: [], ...settings },
});

/** Every call is the same GraphQL endpoint, so assertions read the query. */
const sentQuery = (fetchStub: ReturnType<typeof stubFetch>, nth = 0) =>
  JSON.parse(String(fetchStub.calls[nth].init.body)).query as string;

describe('HashnodeProvider identity', () => {
  it('declares a markdown editor with Hashnode\'s length cap', () => {
    expect(provider.identifier).toBe('hashnode');
    expect(provider.editor).toBe('markdown');
    expect(provider.maxLength()).toBe(10000);
  });

  it('asks only for an api key', async () => {
    const fields = await provider.customFields();

    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({ key: 'apiKey', type: 'password' });
  });

  it('has no oauth, so the state doubles as the url', async () => {
    const { url, state } = await provider.generateAuthUrl();

    expect(url).toBe(state);
  });

  it('returns an empty token set on refresh, because an api key does not expire', async () => {
    await expect(provider.refreshToken('x')).resolves.toMatchObject({
      accessToken: '',
      expiresIn: 0,
    });
  });
});

describe('HashnodeProvider.tags', () => {
  it('reshapes the bundled tag list for a select control', async () => {
    const result = await provider.tags();

    expect(result.length).toBeGreaterThan(100);
    expect(result[0]).toMatchObject({
      value: expect.any(String),
      label: expect.any(String),
    });
  });

  it('exposes the raw list to the agent tool', () => {
    const raw = provider.tagsList();

    expect(Array.isArray(raw)).toBe(true);
    expect(raw[0]).toHaveProperty('objectID');
  });

  it('maps objectID to value, which is what the post mutation sends', async () => {
    const [first] = await provider.tags();
    const raw = provider.tagsList();

    expect(first.value).toBe(raw[0].objectID);
    expect(first.label).toBe(raw[0].name);
  });
});

describe('HashnodeProvider.authenticate', () => {
  it('identifies the user over GraphQL and keeps the api key', async () => {
    const fetchStub = stubFetch([
      [
        'gql.hashnode.com',
        () => ({
          data: {
            me: {
              id: 'user-1',
              name: 'A Writer',
              username: 'awriter',
              profilePicture: 'https://cdn.test/me.png',
            },
          },
        }),
      ],
    ]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toMatchObject({
      id: 'user-1',
      name: 'A Writer',
      username: 'awriter',
      accessToken: API_KEY,
      picture: 'https://cdn.test/me.png',
    });

    // Hashnode takes the key bare, not as a Bearer token.
    expect(fetchStub.calls[0].init.headers).toMatchObject({
      Authorization: API_KEY,
      'Content-Type': 'application/json',
    });
    expect(sentQuery(fetchStub)).toContain('me');
  });

  it('falls back to an empty picture when there is no avatar', async () => {
    stubFetch([
      ['gql.hashnode.com', () => ({ data: { me: { id: '1', name: 'x', username: 'y' } } })],
    ]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toMatchObject({ picture: '' });
  });

  it('reports invalid credentials rather than throwing when Hashnode rejects the key', async () => {
    stubFetch([
      ['gql.hashnode.com', () => ({ errors: [{ message: 'Unauthorized' }] })],
    ]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toBe('Invalid credentials');
  });

  it('reports invalid credentials when Hashnode is unreachable', async () => {
    stubFetch([]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toBe('Invalid credentials');
  });

  it('issues a token that effectively never expires', async () => {
    stubFetch([
      ['gql.hashnode.com', () => ({ data: { me: { id: '1', name: 'x', username: 'y' } } })],
    ]);

    const result = await provider.authenticate({
      code: credentials(),
      codeVerifier: 'v',
    });

    expect((result as { expiresIn: number }).expiresIn).toBeGreaterThan(
      90 * 365 * 24 * 60 * 60
    );
  });
});

describe('HashnodeProvider.publications', () => {
  it('flattens the GraphQL edge list into id and name', async () => {
    const fetchStub = stubFetch([
      [
        'gql.hashnode.com',
        () => ({
          data: {
            me: {
              publications: {
                edges: [
                  { node: { id: 'pub-1', title: 'The Blog' } },
                  { node: { id: 'pub-2', title: 'Side Notes' } },
                ],
              },
            },
          },
        }),
      ],
    ]);

    await expect(provider.publications(API_KEY)).resolves.toEqual([
      { id: 'pub-1', name: 'The Blog' },
      { id: 'pub-2', name: 'Side Notes' },
    ]);
    expect(sentQuery(fetchStub)).toContain('publications (first: 50)');
  });

  it('returns an empty list when the user has no publications', async () => {
    stubFetch([
      ['gql.hashnode.com', () => ({ data: { me: { publications: { edges: [] } } } })],
    ]);

    await expect(provider.publications(API_KEY)).resolves.toEqual([]);
  });
});

describe('HashnodeProvider.post', () => {
  const publishRoute = () =>
    stubFetch([
      [
        'gql.hashnode.com',
        () => ({
          data: {
            publishPost: {
              post: { id: 'story-1', url: 'https://blog.test/a-post' },
            },
          },
        }),
      ],
    ]);

  beforeEach(() => {
    process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.postiz.test';
    process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY = 'uploads';
  });

  it('publishes the markdown to the chosen publication', async () => {
    const fetchStub = publishRoute();

    await expect(
      provider.post('user-1', API_KEY, [post() as never], integration)
    ).resolves.toEqual([
      {
        id: 'post-1',
        status: 'completed',
        postId: 'story-1',
        releaseURL: 'https://blog.test/a-post',
      },
    ]);

    const query = sentQuery(fetchStub);
    expect(query).toContain('publishPost');
    expect(query).toContain('"A Post"');
    expect(query).toContain('publicationId: "pub-1"');
  });

  it('sends tag ids, because Hashnode addresses tags by id not name', async () => {
    const fetchStub = publishRoute();

    await provider.post(
      'user-1',
      API_KEY,
      [post({ tags: [{ value: 'tag-1', label: 'JavaScript' }] }) as never],
      integration
    );

    expect(sentQuery(fetchStub)).toContain('id: "tag-1"');
  });

  it('omits the optional fields when they are not set', async () => {
    const fetchStub = publishRoute();

    await provider.post('user-1', API_KEY, [post() as never], integration);

    const query = sentQuery(fetchStub);
    expect(query).not.toContain('originalArticleURL');
    expect(query).not.toContain('subtitle');
    expect(query).not.toContain('coverImageOptions');
  });

  it('includes the canonical url and subtitle when they are set', async () => {
    const fetchStub = publishRoute();

    await provider.post(
      'user-1',
      API_KEY,
      [
        post({
          canonical: 'https://blog.test/original',
          subtitle: 'A subtitle',
        }) as never,
      ],
      integration
    );

    const query = sentQuery(fetchStub);
    expect(query).toContain('originalArticleURL: "https://blog.test/original"');
    expect(query).toContain('subtitle: "A subtitle"');
  });

  it('passes an absolute cover image through untouched', async () => {
    const fetchStub = publishRoute();

    await provider.post(
      'user-1',
      API_KEY,
      [post({ main_image: { path: 'https://cdn.test/cover.png' } }) as never],
      integration
    );

    expect(sentQuery(fetchStub)).toContain('coverImageURL: "https://cdn.test/cover.png"');
  });

  it('prefixes a locally stored cover image with the public upload origin', async () => {
    // Hashnode fetches the cover itself, so a bare storage path would 404.
    const fetchStub = publishRoute();

    await provider.post(
      'user-1',
      API_KEY,
      [post({ main_image: { path: '/uploads/cover.png' } }) as never],
      integration
    );

    expect(sentQuery(fetchStub)).toContain(
      'coverImageURL: "https://api.postiz.test/uploads/uploads/cover.png"'
    );
  });

  it('authenticates with the bare api key', async () => {
    const fetchStub = publishRoute();

    await provider.post('user-1', API_KEY, [post() as never], integration);

    expect(fetchStub.calls[0].init.headers).toMatchObject({
      Authorization: API_KEY,
      'Content-Type': 'application/json',
    });
  });

  it('only publishes the first post of the batch', async () => {
    const fetchStub = publishRoute();

    await provider.post(
      'user-1',
      API_KEY,
      [post() as never, post() as never],
      integration
    );

    expect(fetchStub.countTo('gql.hashnode.com')).toBe(1);
  });
});
