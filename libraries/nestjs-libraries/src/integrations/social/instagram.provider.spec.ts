vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody, NotEnoughScopes } from '../social.abstract';
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

  it.each([
    ['2207032', 'Failed to create media, please try again'],
    ['2207053', 'Unknown upload error, please try again'],
    ['2207057', 'Invalid thumbnail offset for video'],
    ['2207026', 'Unsupported video format'],
    ['2207023', 'Unknown media type'],
    ['2207006', 'Media not found, please upload again'],
    ['2207008', 'Media builder expired, please try again'],
    ['2207028', 'Carousel validation failed'],
    ['2207010', 'Caption is too long'],
    ['2207035', 'Product tag positions not supported for videos'],
    ['2207036', 'Product tag positions required for photos'],
    ['2207037', 'Product tag validation failed'],
    ['2207040', 'Too many product tags'],
    ['2207004', 'Image is too large'],
    ['2207005', 'Unsupported image format'],
    ['2207009', 'Aspect ratio not supported, must be between 4:5 to 1.91:1'],
    ['36003', 'Aspect ratio not supported, must be between 4:5 to 1.91:1'],
    ['36001', 'Invalid Instagram image resolution max: 1920x1080px'],
    ['2207051', 'Instagram blocked your request'],
    ['2207077', 'Instagram Video download failed'],
    ['2207027', 'Unknown error, please try again later or contact support'],
    [
      '2207042',
      'You have reached the maximum of 25 posts per day, allowed for your account',
    ],
    ['Page request limit reached', 'Page posting for today is limited, please try again tomorrow'],
    ['Not enough permissions to post', 'Not enough permissions to post'],
    [
      '190,',
      'The account is missing some permissions to perform this action, please re-add the account and allow all permissions',
    ],
    [
      '2207001',
      'Instagram detected that your post is spam, please try again with different content',
    ],
    [
      'too little or too many attachments',
      'Instagram carousel should have between 2 and 10 media attachments',
    ],
    ['param collaborators is not allowed', 'Collaborators are not allowed for carousel'],
  ] as [string, string][])('reports %s as a terminal bad body', (body, value) => {
    expect(provider.handleErrors(body, 400)).toEqual({ type: 'bad-body', value });
  });

  it.each([
    ['2207052', 'Media fetch failed, please try again'],
    ['2207082', 'Could not upload your media'],
  ] as [string, string][])('asks for a retry on %s', (body, value) => {
    expect(provider.handleErrors(body, 400)).toEqual({ type: 'retry', value });
  });

  it('explains a missing publishing permission in full', () => {
    expect(
      provider.handleErrors('Requires instagram_content_publish permission', 400)
    ).toMatchObject({
      type: 'bad-body',
      value: expect.stringMatching(/was not granted publishing permission/),
    });
  });

  it('explains a collaborator that could not be tagged', () => {
    expect(provider.handleErrors('2207018', 400)).toMatchObject({
      type: 'bad-body',
      value: expect.stringMatching(/could not be tagged/),
    });
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

describe('InstagramProvider.generateAuthUrl', () => {
  it('asks facebook for every scope the provider needs', async () => {
    vi.stubEnv('FACEBOOK_APP_ID', 'app-1');
    vi.stubEnv('FRONTEND_URL', 'https://app.example.com');

    const { url, state, codeVerifier } = await provider.generateAuthUrl();

    expect(url).toContain('client_id=app-1');
    expect(url).toContain(
      encodeURIComponent('https://app.example.com/integrations/social/instagram')
    );
    expect(url).toContain(`state=${state}`);
    expect(url).toContain(encodeURIComponent(provider.scopes.join(',')));
    expect(codeVerifier).toEqual(expect.any(String));
  });
});

describe('InstagramProvider.authenticate', () => {
  const granted = () => ({
    data: provider.scopes.map((permission) => ({
      permission,
      status: 'granted',
    })),
  });

  const routes = (
    permissions: unknown
  ): Parameters<typeof stubFetch>[0] => [
    ['grant_type=fb_exchange_token', () => ({ access_token: 'long-lived' })],
    ['/oauth/access_token', () => ({ access_token: 'short-lived' })],
    ['me/permissions', () => permissions],
    [
      'me?fields=id,name,picture',
      () => ({ id: 'u1', name: 'Dana', picture: { data: { url: 'https://pic' } } }),
    ],
  ];

  it('exchanges the code for a long lived token and reads the profile', async () => {
    const http = stubFetch(routes(granted()));

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: '' })
    ).resolves.toMatchObject({
      id: 'u1',
      name: 'Dana',
      accessToken: 'long-lived',
      refreshToken: 'long-lived',
      picture: 'https://pic',
      username: '',
    });

    expect(
      http.urls().some((u) => u.includes('fb_exchange_token=short-lived'))
    ).toBe(true);
  });

  it('reports roughly two months of validity', async () => {
    stubFetch(routes(granted()));

    const { expiresIn } = await provider.authenticate({
      code: 'c',
      codeVerifier: 'v',
      refresh: '',
    });

    expect(expiresIn).toBeGreaterThan(58 * 24 * 60 * 60);
  });

  it('carries a refresh marker into the redirect uri', async () => {
    const http = stubFetch(routes(granted()));

    await provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: 'ig-1' });

    expect(http.urls()[0]).toContain(encodeURIComponent('?refresh=ig-1'));
  });

  it('refuses a connection that did not grant every scope', async () => {
    stubFetch(
      routes({ data: [{ permission: 'instagram_basic', status: 'granted' }] })
    );

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: '' })
    ).rejects.toBeInstanceOf(NotEnoughScopes);
  });

  it('ignores a permission the user declined', async () => {
    stubFetch(
      routes({
        data: [
          ...provider.scopes.map((permission) => ({
            permission,
            status: 'granted',
          })),
          { permission: 'extra_scope', status: 'declined' },
        ],
      })
    );

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: '' })
    ).resolves.toMatchObject({ accessToken: 'long-lived' });
  });

  it('falls back to an empty picture when facebook returns none', async () => {
    stubFetch([
      ['grant_type=fb_exchange_token', () => ({ access_token: 'long-lived' })],
      ['/oauth/access_token', () => ({ access_token: 'short-lived' })],
      ['me/permissions', () => granted()],
      ['me?fields=id,name,picture', () => ({ id: 'u1', name: 'Dana' })],
    ]);

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v', refresh: '' })
    ).resolves.toMatchObject({ picture: '' });
  });
});

describe('InstagramProvider.pages', () => {
  const igPage = (id: string, igId: string) => ({
    id,
    name: `Page ${id}`,
    instagram_business_account: { id: igId },
  });

  it('follows pagination and keeps only pages with an instagram account', async () => {
    stubFetch([
      [
        'me/accounts',
        () => ({
          data: [igPage('p1', 'ig1'), { id: 'p-no-ig', name: 'No IG' }],
          paging: { next: 'https://graph.facebook.com/page-two' },
        }),
      ],
      ['page-two', () => ({ data: [igPage('p2', 'ig2')] })],
      ['me/businesses', () => ({ data: [] })],
      [
        'fields=name,profile_picture_url',
        ({ url }) => ({
          name: url.includes('/ig1') ? 'First' : 'Second',
          profile_picture_url: 'https://pic',
        }),
      ],
    ]);

    await expect(provider.pages('token')).resolves.toEqual([
      { pageId: 'p1', id: 'ig1', name: 'First', picture: { data: { url: 'https://pic' } } },
      { pageId: 'p2', id: 'ig2', name: 'Second', picture: { data: { url: 'https://pic' } } },
    ]);
  });

  it('discovers pages owned by a business and never lists one twice', async () => {
    stubFetch([
      ['me/accounts', () => ({ data: [igPage('p1', 'ig1')] })],
      ['me/businesses', () => ({ data: [{ id: 'biz1' }] })],
      ['owned_pages', () => ({ data: [igPage('p1', 'ig1'), igPage('p9', 'ig9')] })],
      ['client_pages', () => ({ data: [] })],
      [
        'fields=name,profile_picture_url',
        () => ({ name: 'A page', profile_picture_url: 'https://pic' }),
      ],
    ]);

    const pages = await provider.pages('token');

    expect(pages.map((p) => p.id)).toEqual(['ig1', 'ig9']);
  });

  it('still returns the shared pages when business manager is unavailable', async () => {
    stubFetch([
      ['me/accounts', () => ({ data: [igPage('p1', 'ig1')] })],
      [
        'me/businesses',
        () => {
          throw new Error('no business manager');
        },
      ],
      [
        'fields=name,profile_picture_url',
        () => ({ name: 'A page', profile_picture_url: 'https://pic' }),
      ],
    ]);

    await expect(provider.pages('token')).resolves.toMatchObject([{ id: 'ig1' }]);
  });

  it('keeps going when one business rejects the page listing', async () => {
    stubFetch([
      ['me/accounts', () => ({ data: [igPage('p1', 'ig1')] })],
      ['me/businesses', () => ({ data: [{ id: 'biz1' }] })],
      [
        'owned_pages',
        () => {
          throw new Error('forbidden');
        },
      ],
      ['client_pages', () => ({ data: [igPage('p2', 'ig2')] })],
      [
        'fields=name,profile_picture_url',
        () => ({ name: 'A page', profile_picture_url: 'https://pic' }),
      ],
    ]);

    await expect(provider.pages('token')).resolves.toHaveLength(2);
  });

  it('uses only the page half of a combined token', async () => {
    const http = stubFetch([
      ['me/accounts', () => ({ data: [] })],
      ['me/businesses', () => ({ data: [] })],
    ]);

    await provider.pages('page-token___user-token');

    expect(http.urls()[0]).toContain('access_token=page-token');
    expect(http.urls()[0]).not.toContain('user-token');
  });
});

describe('InstagramProvider.fetchPageInformation', () => {
  it('combines the page token with the user token', async () => {
    stubFetch([
      ['fields=access_token,name', () => ({ access_token: 'page-token' })],
      [
        'fields=username,name,profile_picture_url',
        () => ({
          id: 'ig1',
          name: 'The account',
          profile_picture_url: 'https://pic',
          username: 'the_account',
        }),
      ],
    ]);

    await expect(
      provider.fetchPageInformation('user-token', { pageId: 'p1', id: 'ig1' })
    ).resolves.toEqual({
      id: 'ig1',
      name: 'The account',
      picture: 'https://pic',
      access_token: 'page-token___user-token',
      username: 'the_account',
    });
  });
});

describe('InstagramProvider.reConnect', () => {
  it('resolves the page behind the instagram account before reading it', async () => {
    stubFetch([
      [
        'me/accounts',
        () => ({
          data: [{ id: 'p1', instagram_business_account: { id: 'ig1' } }],
        }),
      ],
      ['me/businesses', () => ({ data: [] })],
      [
        'fields=name,profile_picture_url',
        () => ({ name: 'The account', profile_picture_url: 'https://pic' }),
      ],
      ['fields=access_token,name', () => ({ access_token: 'page-token' })],
      [
        'fields=username,name,profile_picture_url',
        () => ({
          id: 'ig1',
          name: 'The account',
          profile_picture_url: 'https://pic',
          username: 'the_account',
        }),
      ],
    ]);

    await expect(provider.reConnect('id', 'ig1', 'token')).resolves.toEqual({
      id: 'ig1',
      name: 'The account',
      accessToken: 'page-token___token',
      picture: 'https://pic',
      username: 'the_account',
    });
  });
});

describe('InstagramProvider.post', () => {
  it('drives container, status and publish to a live post', async () => {
    stubFetch([
      ['/media?', () => ({ id: 'c1' })],
      ['fields=status_code,status', () => ({ status_code: 'FINISHED' })],
      ['media_publish', () => ({ id: 'm1' })],
      ['fields=permalink', () => ({ permalink: 'https://instagram.test/p/m1' })],
    ]);

    await expect(
      provider.post('ig-1', 'token', [post()] as never, integration)
    ).resolves.toEqual([
      {
        id: 'post-1',
        postId: 'm1',
        releaseURL: 'https://instagram.test/p/m1',
        status: 'success',
      },
    ]);
  });

  it('gives up rather than let the old activity time out and republish', async () => {
    const base = Date.now();
    let elapsed = 0;
    const now = vi.spyOn(Date, 'now').mockImplementation(() => base + elapsed);

    stubFetch([
      ['/media?', () => ({ id: 'c1' })],
      [
        'fields=status_code,status',
        () => {
          elapsed = 10 * 60 * 1000;
          return { status_code: 'IN_PROGRESS' };
        },
      ],
    ]);

    await expect(
      provider.post('ig-1', 'token', [post()] as never, integration)
    ).rejects.toThrow(/Media processing timed out/);

    now.mockRestore();
  });
});

describe('InstagramProvider.comment', () => {
  it('posts the comment and returns the parent permalink', async () => {
    const http = stubFetch([
      ['/comments?', () => ({ id: 'cm-1' })],
      ['fields=permalink', () => ({ permalink: 'https://instagram.test/p/m1' })],
    ]);

    await expect(
      provider.comment(
        'ig-1',
        'm1',
        undefined,
        'page-token___user-token',
        [post({ id: 'c-post', message: 'nice one' })] as never,
        integration
      )
    ).resolves.toEqual([
      {
        id: 'c-post',
        postId: 'cm-1',
        releaseURL: 'https://instagram.test/p/m1',
        status: 'success',
      },
    ]);

    expect(http.urls()[0]).toContain(`message=${encodeURIComponent('nice one')}`);
    expect(http.urls()[0]).toContain('access_token=page-token');
    expect(http.urls()[1]).toContain('access_token=user-token');
  });
});

describe('InstagramProvider.analytics', () => {
  it('labels the day series and the total value metrics', async () => {
    stubFetch([
      [
        'metric=follower_count,reach',
        () => ({
          data: [
            {
              name: 'follower_count',
              values: [{ value: 10, end_time: '2024-05-01T07:00:00+0000' }],
            },
            {
              name: 'reach',
              values: [{ value: 20, end_time: '2024-05-01T07:00:00+0000' }],
            },
          ],
        }),
      ],
      [
        'metric_type=total_value',
        () => ({
          data: [
            { name: 'likes', total_value: { value: 5 } },
            { name: 'views', total_value: { value: 50 } },
            { name: 'comments', total_value: { value: 2 } },
            { name: 'shares', total_value: { value: 1 } },
            { name: 'saves', total_value: { value: 3 } },
            { name: 'replies', total_value: { value: 4 } },
          ],
        }),
      ],
    ]);

    const result = await provider.analytics('ig1', 'token', 7);

    expect(result.map((r) => r.label)).toEqual([
      'Follower Count',
      'Reach',
      'Likes',
      'Views',
      'Comments',
      'Shares',
      'Saves',
      'Replies',
    ]);
    expect(result[0].data).toEqual([{ total: 10, date: '2024-05-01' }]);
  });

  it('leaves an unknown metric unlabelled instead of guessing', async () => {
    stubFetch([
      ['metric=follower_count,reach', () => ({ data: [] })],
      [
        'metric_type=total_value',
        () => ({ data: [{ name: 'brand_new', total_value: { value: 1 } }] }),
      ],
    ]);

    await expect(provider.analytics('ig1', 'token', 7)).resolves.toMatchObject([
      { label: '' },
    ]);
  });

  it('survives a day series the api omitted entirely', async () => {
    stubFetch([
      ['metric=follower_count,reach', () => ({})],
      ['metric_type=total_value', () => ({ data: [] })],
    ]);

    await expect(provider.analytics('ig1', 'token', 7)).resolves.toEqual([]);
  });
});

describe('InstagramProvider audio', () => {
  it('searches the music catalogue', async () => {
    const http = stubFetch([['music/search', () => ({ data: [] })]]);

    await provider.music('token', { q: 'lofi beats' });

    expect(http.urls()[0]).toContain(`q=${encodeURIComponent('lofi beats')}`);
  });

  it('maps the audio results onto the picker shape', async () => {
    stubFetch([
      [
        'ig_audio',
        () => ({
          audio: [
            {
              audio_id: 'a1',
              title: 'Track',
              display_artist: 'Artist',
              cover_artwork_thumbnail_uri: 'https://cover',
              duration_in_ms: 1000,
              download_url: 'https://preview',
            },
          ],
        }),
      ],
    ]);

    await expect(
      provider.audioSearch('token', { q: 'lofi' }, 'ig-1')
    ).resolves.toEqual([
      {
        id: 'a1',
        title: 'Track',
        artist: 'Artist',
        image: 'https://cover',
        duration: 1000,
        previewUrl: 'https://preview',
      },
    ]);
  });

  it('falls back through the alternate artwork and artist fields', async () => {
    stubFetch([
      [
        'ig_audio',
        () => ({
          audio: [{ audio_id: 'a1', ig_username: 'creator', profile_picture_url: 'https://pfp' }],
        }),
      ],
    ]);

    await expect(provider.audioSearch('token', {}, 'ig-1')).resolves.toEqual([
      {
        id: 'a1',
        title: '',
        artist: 'creator',
        image: 'https://pfp',
        duration: 0,
        previewUrl: '',
      },
    ]);
  });

  it('defaults to music and omits the query when searching trending audio', async () => {
    const http = stubFetch([['ig_audio', () => ({ audio: [] })]]);

    await provider.audioSearch('token', {}, 'ig-1');

    expect(http.urls()[0]).toContain('audio_type=music');
    expect(http.urls()[0]).not.toContain('search_query');
  });

  it('supports original sounds and prefers the user token', async () => {
    const http = stubFetch([['ig_audio', () => ({ audio: [] })]]);

    await provider.audioSearch(
      'page-token___user-token',
      { type: 'original_sound' },
      'ig-1'
    );

    expect(http.urls()[0]).toContain('audio_type=original_sound');
    expect(http.urls()[0]).toContain('access_token=user-token');
  });

  it('returns nothing when the account has no audio available', async () => {
    stubFetch([['ig_audio', () => ({})]]);

    await expect(provider.audioSearch('token', {}, 'ig-1')).resolves.toEqual([]);
  });
});

describe('InstagramProvider.postAnalytics', () => {
  it('labels every supported media metric', async () => {
    stubFetch([
      [
        '/insights?metric=views,reach',
        () => ({
          data: [
            { name: 'views', values: [{ value: 100 }] },
            { name: 'reach', values: [{ value: 90 }] },
            { name: 'saved', values: [{ value: 5 }] },
            { name: 'likes', values: [{ value: 10 }] },
            { name: 'comments', values: [{ value: 2 }] },
            { name: 'shares', values: [{ value: 1 }] },
          ],
        }),
      ],
    ]);

    const result = await provider.postAnalytics('ig-1', 'token', 'm1', 7);

    expect(result.map((r) => r.label)).toEqual([
      'Views',
      'Reach',
      'Saves',
      'Likes',
      'Comments',
      'Shares',
    ]);
    expect(result[0].data[0].total).toBe('100');
  });

  it('skips a metric with no value and one it cannot label', async () => {
    stubFetch([
      [
        '/insights?metric=views,reach',
        () => ({
          data: [
            { name: 'views', values: [] },
            { name: 'brand_new', values: [{ value: 1 }] },
            { name: 'likes', values: [{ value: 7 }] },
          ],
        }),
      ],
    ]);

    await expect(
      provider.postAnalytics('ig-1', 'token', 'm1', 7)
    ).resolves.toEqual([
      { label: 'Likes', percentageChange: 0, data: [{ total: '7', date: expect.any(String) }] },
    ]);
  });

  it('returns nothing when instagram reports no insights', async () => {
    stubFetch([['/insights?metric=views,reach', () => ({ data: [] })]]);

    await expect(provider.postAnalytics('ig-1', 'token', 'm1', 7)).resolves.toEqual(
      []
    );
  });

  it('never breaks the dashboard on an insights failure', async () => {
    stubFetch([
      [
        '/insights?metric=views,reach',
        () => {
          throw new Error('insights unavailable');
        },
      ],
    ]);

    await expect(provider.postAnalytics('ig-1', 'token', 'm1', 7)).resolves.toEqual(
      []
    );
  });
});
