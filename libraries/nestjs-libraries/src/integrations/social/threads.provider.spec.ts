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
