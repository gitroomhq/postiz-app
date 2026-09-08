vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody } from '../social.abstract';
import { InstagramProvider } from './instagram.provider';

const provider = new InstagramProvider();
const integration = { internalId: 'ig-1', profile: 'me' } as never;

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello from the test suite',
  media: [{ path: '/a.jpg' }],
  settings: {},
  ...over,
});

const pending = (over: Record<string, unknown> = {}) => ({
  type: 'graph.facebook.com',
  postType: 'single' as const,
  containers: ['c1'],
  message: 'hello',
  ...over,
});

describe('InstagramProvider.checkValidity', () => {
  it('requires at least one media', async () => {
    await expect(provider.checkValidity([[]], {})).resolves.toBe('Should have at least one media');
  });

  it('caps a carousel at ten attachments', async () => {
    const media = Array.from({ length: 11 }, (_, i) => ({ path: `/a${i}.jpg` }));

    await expect(provider.checkValidity([media], {})).resolves.toBe(
      'Instagram carousel only supports up to 10 media attachments'
    );
  });

  it('accepts a carousel of exactly ten', async () => {
    const media = Array.from({ length: 10 }, (_, i) => ({ path: `/a${i}.jpg` }));

    await expect(provider.checkValidity([media], {})).resolves.toBe(true);
  });

  it('refuses a trial reel with more than one media', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.mp4' }, { path: '/b.mp4' }]], { is_trial_reel: true })
    ).resolves.toBe('Trial Reels can only have one video');
  });

  it('refuses a trial reel that is not a video', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }]], { is_trial_reel: true })
    ).resolves.toBe('Trial Reels must be a video');
  });

  it('refuses audio on a story', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.mp4' }]], {
        post_type: 'story',
        audio: { id: 'audio-1' },
      })
    ).resolves.toBe('Audio can only be added to Reels, not to Stories');
  });

  it('refuses audio on a multi-media post', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.mp4' }, { path: '/b.mp4' }]], {
        audio: { id: 'audio-1' },
      })
    ).resolves.toBe('Audio can only be added to a single video Reel');
  });

  it('refuses audio on a photo', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }]], { audio: { id: 'audio-1' } })
    ).resolves.toBe('Audio can only be added to a video Reel');
  });

  it('accepts audio on a single video reel', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.mp4' }]], { audio: { id: 'audio-1' } })
    ).resolves.toBe(true);
  });
});

describe('InstagramProvider.handleErrors', () => {
  it.each([
    ['{"message":"An unknown error occurred"}', 'An unknown error occurred, please try again later'],
  ])('marks %j retryable', (body, value) => {
    expect(provider.handleErrors(body, 500)).toEqual({ type: 'retry', value });
  });

  it.each([
    ['{"error_subcode":2207081}', "This account doesn't support Trial Reels"],
    ['{"error_subcode":2207050}', 'Instagram user is restricted'],
    ['{"error_subcode":2207003}', 'Timeout downloading media, please try again'],
    ['{"error_subcode":2207020}', 'Media expired, please upload again'],
  ])('reports %j as a terminal bad body', (body, value) => {
    expect(provider.handleErrors(body, 400)).toEqual({ type: 'bad-body', value });
  });

  it.each([
    ['{"error":"REVOKED_ACCESS_TOKEN"}'],
    ['{"error_subcode":33}'],
    ['The user is not an Instagram Business'],
    ['Session has been invalidated'],
  ])('asks for a reconnect on %j', (body) => {
    expect(provider.handleErrors(body, 400)?.type).toBe('refresh-token');
  });

  it('leaves an unrecognised body unclassified', () => {
    expect(provider.handleErrors('{"error":"brand new"}', 400)).toBeUndefined();
  });
});

describe('InstagramProvider container creation', () => {
  it('creates a single image container with the caption attached', async () => {
    const fetch = stubFetch([['/media?', () => ({ id: 'c1' })]]);

    const [response] = await provider.postPending(
      'ig-1',
      'token',
      [post()] as never,
      integration
    );

    expect(fetch.urls()[0]).toContain('image_url=/a.jpg');
    expect(fetch.urls()[0]).toContain(`caption=${encodeURIComponent('hello from the test suite')}`);
    // Containers are invisible until media_publish, so nothing is live yet.
    expect(response).toMatchObject({
      status: 'pending',
      pendingData: { postType: 'single', containers: ['c1'] },
    });
  });

  it('marks every child of a carousel as a carousel item and omits the caption', async () => {
    let n = 0;
    const fetch = stubFetch([['/media?', () => ({ id: `c${++n}` })]]);

    const [response] = await provider.postPending(
      'ig-1',
      'token',
      [post({ media: [{ path: '/a.jpg' }, { path: '/b.jpg' }] })] as never,
      integration
    );

    expect(fetch.urls()[0]).toContain('is_carousel_item=true');
    expect(fetch.urls()[0]).not.toContain('caption=');
    expect(response).toMatchObject({ pendingData: { postType: 'carousel', containers: ['c1', 'c2'] } });
  });

  it('uploads a single mp4 as a reel with a thumbnail offset', async () => {
    const fetch = stubFetch([['/media?', () => ({ id: 'c1' })]]);

    await provider.postPending(
      'ig-1',
      'token',
      [post({ media: [{ path: '/clip.mp4', thumbnailTimestamp: 5 }] })] as never,
      integration
    );

    expect(fetch.urls()[0]).toContain('media_type=REELS');
    expect(fetch.urls()[0]).toContain('thumb_offset=5');
  });

  it('uploads media for a story as STORIES, never as a carousel', async () => {
    let n = 0;
    const fetch = stubFetch([['/media?', () => ({ id: `c${++n}` })]]);

    const [response] = await provider.postPending(
      'ig-1',
      'token',
      [
        post({
          media: [{ path: '/a.jpg' }, { path: '/b.jpg' }],
          settings: { post_type: 'story' },
        }),
      ] as never,
      integration
    );

    expect(fetch.urls()[0]).toContain('media_type=STORIES');
    expect(fetch.urls()[0]).not.toContain('is_carousel_item');
    expect(response).toMatchObject({ pendingData: { postType: 'stories' } });
  });

  it('attaches collaborators to a feed post', async () => {
    const fetch = stubFetch([['/media?', () => ({ id: 'c1' })]]);

    await provider.postPending(
      'ig-1',
      'token',
      [post({ settings: { collaborators: [{ label: 'someone' }] } })] as never,
      integration
    );

    expect(decodeURIComponent(fetch.urls()[0])).toContain('collaborators=["someone"]');
  });

  it('does not attach collaborators to a story', async () => {
    const fetch = stubFetch([['/media?', () => ({ id: 'c1' })]]);

    await provider.postPending(
      'ig-1',
      'token',
      [post({ settings: { post_type: 'story', collaborators: [{ label: 'someone' }] } })] as never,
      integration
    );

    expect(fetch.urls()[0]).not.toContain('collaborators');
  });

  it('omits the audio configuration on Instagram Login, which does not support it', async () => {
    const fetch = stubFetch([['/media?', () => ({ id: 'c1' })]]);

    await provider.postPending(
      'ig-1',
      'token',
      [post({ media: [{ path: '/clip.mp4' }], settings: { audio: { id: 'a1' } } })] as never,
      integration,
      'graph.instagram.com'
    );

    expect(fetch.urls()[0]).not.toContain('audio_configuration');
  });

  it('attaches the audio configuration on Facebook Login', async () => {
    const fetch = stubFetch([['/media?', () => ({ id: 'c1' })]]);

    await provider.postPending(
      'ig-1',
      'token',
      [
        post({
          media: [{ path: '/clip.mp4' }],
          settings: { audio: { id: 'a1', audio_volume: 50, video_volume: 20 } },
        }),
      ] as never,
      integration
    );

    expect(decodeURIComponent(fetch.urls()[0])).toContain(
      '{"audio_id":"a1","audio_volume":50,"video_volume":20}'
    );
  });
});

describe('InstagramProvider.checkPostStatus', () => {
  it('stays pending while the container is still processing', async () => {
    stubFetch([['c1', () => ({ status_code: 'IN_PROGRESS' })]]);

    await expect(provider.checkPostStatus('token', pending(), integration)).resolves.toMatchObject({
      status: 'pending',
    });
  });

  it('is ready once the container finished', async () => {
    stubFetch([['c1', () => ({ status_code: 'FINISHED' })]]);

    await expect(provider.checkPostStatus('token', pending(), integration)).resolves.toMatchObject({
      status: 'ready',
    });
  });

  it('completes instead of publishing again when a single post is already live', async () => {
    stubFetch([['c1', () => ({ status_code: 'PUBLISHED' })]]);

    // A finalizePost that published and then died must never publish twice.
    await expect(provider.checkPostStatus('token', pending(), integration)).resolves.toEqual({
      status: 'completed',
      postId: 'c1',
      releaseURL: 'https://www.instagram.com/me',
    });
  });

  it('lets finalizePost resume stories rather than completing on the first published one', async () => {
    stubFetch([[/c[12]/, () => ({ status_code: 'PUBLISHED' })]]);

    await expect(
      provider.checkPostStatus(
        'token',
        pending({ postType: 'stories', containers: ['c1', 'c2'] }),
        integration
      )
    ).resolves.toMatchObject({ status: 'ready' });
  });

  it('waits on the carousel container once it exists', async () => {
    const fetch = stubFetch([['carousel-1', () => ({ status_code: 'IN_PROGRESS' })]]);

    await expect(
      provider.checkPostStatus(
        'token',
        pending({ postType: 'carousel', containers: ['c1', 'c2'], carouselId: 'carousel-1' }),
        integration
      )
    ).resolves.toMatchObject({ status: 'pending' });

    // Only the carousel matters at this point; re-checking the children wastes
    // calls against a rate-limited API.
    expect(fetch.calls).toHaveLength(1);
  });

  it('fails terminally when Instagram could not process the media', async () => {
    stubFetch([['c1', () => ({ status_code: 'ERROR', status: 'Media is corrupt' })]]);

    await expect(provider.checkPostStatus('token', pending(), integration)).rejects.toBeInstanceOf(
      BadBody
    );
  });

  it('uses the user token when the token carries both', async () => {
    const fetch = stubFetch([['c1', () => ({ status_code: 'FINISHED' })]]);

    await provider.checkPostStatus('page-token___user-token', pending(), integration);

    expect(fetch.urls()[0]).toContain('access_token=user-token');
  });
});

describe('InstagramProvider.finalizePost', () => {
  it('publishes a single container and resolves its permalink', async () => {
    const fetch = stubFetch([
      ['media_publish', () => ({ id: 'm1' })],
      ['fields=permalink', () => ({ permalink: 'https://instagram.test/p/m1' })],
    ]);

    await expect(provider.finalizePost('token', pending(), integration)).resolves.toEqual({
      status: 'completed',
      postId: 'm1',
      releaseURL: 'https://instagram.test/p/m1',
    });
    expect(fetch.urls()[0]).toContain('creation_id=c1');
  });

  it('falls back to the profile url rather than failing a live post over a permalink', async () => {
    stubFetch([
      ['media_publish', () => ({ id: 'm1' })],
      [
        'fields=permalink',
        () => {
          throw new Error('permalink unavailable');
        },
      ],
    ]);

    await expect(provider.finalizePost('token', pending(), integration)).resolves.toMatchObject({
      status: 'completed',
      releaseURL: 'https://www.instagram.com/me',
    });
  });

  it('creates the carousel container first and hands back to the workflow', async () => {
    const fetch = stubFetch([['media_type=CAROUSEL', () => ({ id: 'carousel-1' })]]);

    await expect(
      provider.finalizePost(
        'token',
        pending({ postType: 'carousel', containers: ['c1', 'c2'] }),
        integration
      )
    ).resolves.toEqual({
      status: 'pending',
      pendingData: expect.objectContaining({ carouselId: 'carousel-1' }),
    });

    expect(decodeURIComponent(fetch.urls()[0])).toContain('children=c1,c2');
  });

  it('publishes the carousel once its container exists', async () => {
    const fetch = stubFetch([
      ['media_publish', () => ({ id: 'm1' })],
      ['fields=permalink', () => ({ permalink: 'https://instagram.test/p/m1' })],
    ]);

    await provider.finalizePost(
      'token',
      pending({ postType: 'carousel', containers: ['c1', 'c2'], carouselId: 'carousel-1' }),
      integration
    );

    expect(fetch.urls()[0]).toContain('creation_id=carousel-1');
  });

  it('publishes stories one container at a time', async () => {
    let n = 0;
    const fetch = stubFetch([
      [/\/c[12]\?/, () => ({ status_code: 'FINISHED' })],
      ['media_publish', () => ({ id: `m${++n}` })],
      ['fields=permalink', () => ({ permalink: 'https://instagram.test/stories/m2' })],
    ]);

    await expect(
      provider.finalizePost(
        'token',
        pending({ postType: 'stories', containers: ['c1', 'c2'] }),
        integration
      )
    ).resolves.toMatchObject({ status: 'completed', postId: 'm2' });

    expect(fetch.countTo('media_publish')).toBe(2);
  });

  it('skips a story container a crashed run already published', async () => {
    const fetch = stubFetch([
      ['/c1?', () => ({ status_code: 'PUBLISHED' })],
      ['/c2?', () => ({ status_code: 'FINISHED' })],
      ['media_publish', () => ({ id: 'm2' })],
      ['fields=permalink', () => ({ permalink: 'https://instagram.test/stories/m2' })],
    ]);

    // Re-publishing the first story is exactly the duplicate this guards.
    await provider.finalizePost(
      'token',
      pending({ postType: 'stories', containers: ['c1', 'c2'] }),
      integration
    );

    expect(fetch.countTo('media_publish')).toBe(1);
    expect(fetch.urls().find((u) => u.includes('media_publish'))).toContain('creation_id=c2');
  });
});

describe('InstagramProvider.refreshToken', () => {
  it('returns empty credentials, because Instagram tokens are refreshed through Facebook', async () => {
    await expect(provider.refreshToken('anything')).resolves.toMatchObject({
      accessToken: '',
      refreshToken: '',
      expiresIn: 0,
    });
  });
});
