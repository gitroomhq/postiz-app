import { describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { MediumProvider } from './medium.provider';

const provider = new MediumProvider();
const integration = {} as never;

const API_KEY = 'medium-api-key';

const credentials = () =>
  Buffer.from(JSON.stringify({ apiKey: API_KEY })).toString('base64');

const post = (settings: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: '# Heading\n\nSome markdown.',
  settings: { title: 'A Post', ...settings },
});

describe('MediumProvider identity', () => {
  it('declares a long-form markdown editor', () => {
    expect(provider.identifier).toBe('medium');
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

describe('MediumProvider.authenticate', () => {
  it('identifies the user and keeps the api key as the access token', async () => {
    const fetchStub = stubFetch([
      [
        '/v1/me',
        () => ({
          data: {
            id: 'user-1',
            name: 'A Writer',
            username: 'awriter',
            imageUrl: 'https://cdn.test/me.png',
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
    expect(fetchStub.calls[0].init.headers).toMatchObject({
      Authorization: `Bearer ${API_KEY}`,
    });
  });

  it('falls back to an empty picture when there is no avatar', async () => {
    stubFetch([['/v1/me', () => ({ data: { id: '1', name: 'x', username: 'y' } })]]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toMatchObject({ picture: '' });
  });

  it('reports invalid credentials rather than throwing when Medium is unreachable', async () => {
    stubFetch([]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toBe('Invalid credentials');
  });

  it('reports invalid credentials when the answer carries no data', async () => {
    stubFetch([['/v1/me', () => ({ errors: [{ message: 'Token was invalid' }] })]]);

    await expect(
      provider.authenticate({ code: credentials(), codeVerifier: 'v' })
    ).resolves.toBe('Invalid credentials');
  });

  it('issues a token that effectively never expires', async () => {
    stubFetch([['/v1/me', () => ({ data: { id: '1', name: 'x', username: 'y' } })]]);

    const result = await provider.authenticate({
      code: credentials(),
      codeVerifier: 'v',
    });

    expect((result as { expiresIn: number }).expiresIn).toBeGreaterThan(
      90 * 365 * 24 * 60 * 60
    );
  });
});

describe('MediumProvider.publications', () => {
  it('lists the publications the user can write for', async () => {
    const fetchStub = stubFetch([
      [
        '/publications',
        () => ({ data: [{ id: 'pub-1', name: 'The Blog' }] }),
      ],
    ]);

    await expect(provider.publications(API_KEY, {}, 'user-1')).resolves.toEqual([
      { id: 'pub-1', name: 'The Blog' },
    ]);
    expect(fetchStub.urls()[0]).toBe(
      'https://api.medium.com/v1/users/user-1/publications'
    );
    expect(fetchStub.calls[0].init.headers).toMatchObject({
      Authorization: `Bearer ${API_KEY}`,
    });
  });

  it('returns an empty list when there are none', async () => {
    stubFetch([['/publications', () => ({ data: [] })]]);

    await expect(provider.publications(API_KEY, {}, 'user-1')).resolves.toEqual([]);
  });
});

describe('MediumProvider.post', () => {
  const postRoute = (over: Record<string, unknown> = {}) =>
    stubFetch([
      [
        '/posts',
        () => ({
          data: { id: 'story-1', url: 'https://medium.com/@awriter/a-post-1a2b', ...over },
        }),
      ],
    ]);

  it('publishes to the user\'s own profile as a public story', async () => {
    const fetchStub = postRoute();

    await expect(
      provider.post('user-1', API_KEY, [post() as never], integration)
    ).resolves.toEqual([
      {
        id: 'post-1',
        status: 'completed',
        postId: 'story-1',
        releaseURL: 'https://medium.com/@awriter/a-post-1a2b',
      },
    ]);

    expect(fetchStub.urls()[0]).toBe('https://api.medium.com/v1/users/user-1/posts');
    expect(fetchStub.body('/posts')).toMatchObject({
      title: 'A Post',
      contentFormat: 'markdown',
      content: '# Heading\n\nSome markdown.',
      publishStatus: 'public',
    });
  });

  it('posts to a publication as a draft, because Medium requires editor review', async () => {
    // A publication story cannot be published directly by the API; sending
    // "public" there would be rejected.
    const fetchStub = postRoute();

    await provider.post(
      'user-1',
      API_KEY,
      [post({ publication: 'pub-1' }) as never],
      integration
    );

    expect(fetchStub.urls()[0]).toBe(
      'https://api.medium.com/v1/publications/pub-1/posts'
    );
    expect(fetchStub.body('/posts').publishStatus).toBe('draft');
  });

  it('sends tag values rather than their labels', async () => {
    const fetchStub = postRoute();

    await provider.post(
      'user-1',
      API_KEY,
      [
        post({
          tags: [
            { value: 'javascript', label: 'JavaScript' },
            { value: 'testing', label: 'Testing' },
          ],
        }) as never,
      ],
      integration
    );

    expect(fetchStub.body('/posts').tags).toEqual(['javascript', 'testing']);
  });

  it('omits tags and the canonical url when they are not set', async () => {
    const fetchStub = postRoute();

    await provider.post('user-1', API_KEY, [post() as never], integration);

    const body = fetchStub.body('/posts');
    expect(body).not.toHaveProperty('tags');
    expect(body).not.toHaveProperty('canonicalUrl');
  });

  it('omits tags when the list is present but empty', async () => {
    const fetchStub = postRoute();

    await provider.post('user-1', API_KEY, [post({ tags: [] }) as never], integration);

    expect(fetchStub.body('/posts')).not.toHaveProperty('tags');
  });

  it('includes the canonical url when one is set', async () => {
    const fetchStub = postRoute();

    await provider.post(
      'user-1',
      API_KEY,
      [post({ canonical: 'https://blog.test/original' }) as never],
      integration
    );

    expect(fetchStub.body('/posts').canonicalUrl).toBe('https://blog.test/original');
  });

  it('authenticates with a bearer token and sends json', async () => {
    const fetchStub = postRoute();

    await provider.post('user-1', API_KEY, [post() as never], integration);

    expect(fetchStub.calls[0].init.headers).toMatchObject({
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    });
  });

  it('only publishes the first post of the batch', async () => {
    const fetchStub = postRoute();

    await provider.post(
      'user-1',
      API_KEY,
      [post() as never, post() as never],
      integration
    );

    expect(fetchStub.countTo('/posts')).toBe(1);
  });
});
