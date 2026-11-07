vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

const v2Get = vi.fn();
const v2Post = vi.fn();
const uploadMedia = vi.fn();
const tweetLikedBy = vi.fn();
const retweet = vi.fn();
const tweet = vi.fn();
const me = vi.fn();
const meWithFields = vi.fn();
const userTimeline = vi.fn();
const tweets = vi.fn();
const singleTweet = vi.fn();
const userByUsername = vi.fn();
const generateAuthLink = vi.fn();
// Hoisted: social.abstract imports readOrFetch at module load, before the
// plain consts above would have been initialised.
const { readOrFetch } = vi.hoisted(() => ({ readOrFetch: vi.fn() }));
const login = vi.fn();

// twitter-api-v2 opens its own HTTP client and never goes through this.fetch,
// so the only way to drive these paths is to stand in for the client.
// readOrFetch pulls remote media through axios, which never sees the stubbed
// global fetch.
vi.mock('@gitroom/helpers/utils/read.or.fetch', () => ({ readOrFetch }));

vi.mock('twitter-api-v2', () => ({
  TwitterApi: class {
    v2 = {
      get: v2Get,
      post: v2Post,
      uploadMedia,
      tweetLikedBy,
      retweet,
      tweet,
      me,
      userTimeline,
      tweets,
      singleTweet,
      userByUsername,
    };
    v1 = {};
    generateAuthLink = generateAuthLink;
    login = login;
    readWrite = this;
  },
}));

import sharp from 'sharp';
import { TwitterApi } from 'twitter-api-v2';

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody, RefreshToken } from '../social.abstract';
import { XProvider } from './x.provider';

const provider = new XProvider();
const integration = { internalId: 'x-1', profile: 'me' } as never;

const pending = (over: Record<string, unknown> = {}) => ({
  message: 'hello from the test suite',
  settings: {},
  mediaIds: [],
  processingIds: [],
  ...over,
});

const confirmed = (over: Record<string, unknown> = {}) =>
  pending({ attempting: true, confirmed: true, ...over });

describe('XProvider.maxLength', () => {
  it('gives an article effectively no limit', () => {
    expect(provider.maxLength([], { post_type: 'article' })).toBe(100000);
  });

  it('gives a premium account the longer tweet limit', () => {
    expect(provider.maxLength([{ title: 'Verified', value: true }], {})).toBe(4000);
  });

  it('keeps a non-premium account at the standard limit', () => {
    expect(provider.maxLength([{ title: 'Verified', value: false }], {})).toBe(280);
  });

  it('falls back to the standard limit when nothing is known', () => {
    expect(provider.maxLength()).toBe(280);
  });

  it('accepts the legacy boolean callers still pass', () => {
    expect(provider.maxLength(true as never)).toBe(4000);
    expect(provider.maxLength(false as never)).toBe(280);
  });
});

describe('XProvider.checkValidity', () => {
  it('accepts any media on a normal post', async () => {
    await expect(
      provider.checkValidity([[{ path: '/clip.mp4' }]], { post_type: 'post' })
    ).resolves.toBe(true);
  });

  it('refuses a video inside an article', async () => {
    await expect(
      provider.checkValidity([[{ path: '/clip.mp4' }]], { post_type: 'article' })
    ).resolves.toBe('X articles only support images');
  });

  it('refuses a video attached to an article thread reply', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }], [{ path: '/clip.mp4' }]], {
        post_type: 'article',
        article_status: 'published',
      })
    ).resolves.toBe('X articles only support images');
  });

  it('refuses replies on a draft article, which has no post to reply to', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }], [{ path: '/b.jpg' }]], {
        post_type: 'article',
        article_status: 'draft',
      })
    ).resolves.toBe(
      'A draft article cannot have thread replies, remove them or publish the article'
    );
  });

  it('accepts replies on a published article', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }], [{ path: '/b.jpg' }]], {
        post_type: 'article',
        article_status: 'published',
      })
    ).resolves.toBe(true);
  });
});

describe('XProvider.handleErrors', () => {
  it('marks an X outage retryable', () => {
    expect(provider.handleErrors('Service Unavailable')).toEqual({
      type: 'retry',
      value: 'X is currently unavailable, please try again later',
    });
  });

  it('asks for a reconnect on an expired authentication', () => {
    expect(provider.handleErrors('Unsupported Authentication')).toEqual({
      type: 'refresh-token',
      value: 'X authentication has expired, please reconnect your account',
    });
  });

  it.each([
    ['You are not permitted to perform this action', 'check character count'],
    ['maximum of one cashtag', 'one cashtag'],
    ['maximum of 4 items', 'maximum of 4 items'],
    ['You are not allowed to create a Tweet', 'duplicate content'],
    ['usage-capped', 'capped reached'],
    ['user-suspended', 'suspended'],
    ['duplicate-rules', 'already posted'],
    ['Your account is not permitted to access this feature', 'X blocked your request'],
    ['The Tweet contains an invalid URL.', 'URL that is not allowed'],
    ['This user is not allowed to post a video longer than 2 minutes', 'longer than 2 minutes'],
  ])('reports %j as a terminal bad body', (body, fragment) => {
    const result = provider.handleErrors(body);

    expect(result?.type).toBe('bad-body');
    expect(result?.value).toContain(fragment);
  });

  it('leaves an unrecognised body unclassified', () => {
    expect(provider.handleErrors('{"error":"brand new"}')).toBeUndefined();
  });
});

describe('XProvider.stripLinks', () => {
  it('is off unless the deployment opts in', () => {
    expect(provider.stripLinks()).toBe(false);
  });

  it('is on when the deployment sets the flag', () => {
    vi.stubEnv('STRIP_LINKS_FROM_X_POSTS', 'true');

    expect(provider.stripLinks()).toBe(true);
  });
});

describe('XProvider.postPending', () => {
  it('uploads the media and hands the tweet back as pending', async () => {
    const upload = vi
      .spyOn(provider as any, 'uploadMediaEntries')
      .mockResolvedValue({ media: { 'post-1': ['media-1'] }, processingIds: ['media-1'] });

    const [response] = await provider.postPending(
      'x-1',
      'token:secret',
      [
        {
          id: 'post-1',
          message: '<p>hello world</p>',
          media: [{ path: '/clip.mp4' }],
          settings: { who_can_reply_post: 'following' },
        },
      ] as never,
      integration
    );

    // Nothing is on the timeline yet: a failure here leaves orphaned media,
    // never a published tweet.
    expect(response).toMatchObject({
      status: 'pending',
      pendingData: {
        message: 'hello world',
        mediaIds: ['media-1'],
        processingIds: ['media-1'],
        settings: expect.objectContaining({ who_can_reply_post: 'following' }),
      },
    });

    upload.mockRestore();
  });

  it('renders editor bold as the unicode X actually displays', async () => {
    const upload = vi
      .spyOn(provider as any, 'uploadMediaEntries')
      .mockResolvedValue({ media: {}, processingIds: [] });

    const [response] = await provider.postPending(
      'x-1',
      'token:secret',
      [
        {
          id: 'post-1',
          message: '<p>hello <strong>world</strong></p>',
          media: [],
          settings: {},
        },
      ] as never,
      integration
    );

    // X has no rich text, so the editor's bold becomes mathematical bold
    // characters rather than being dropped or posted as markup.
    const { message } = (response as { pendingData: { message: string } }).pendingData;
    expect(message).toMatch(/^hello /);
    expect(message).not.toContain('<strong>');
    expect(message).not.toBe('hello world');

    upload.mockRestore();
  });

  it('keeps the html of an article rather than flattening it', async () => {
    const upload = vi
      .spyOn(provider as any, 'uploadMediaEntries')
      .mockResolvedValue({ media: {}, processingIds: [] });

    const [response] = await provider.postPending(
      'x-1',
      'token:secret',
      [
        {
          id: 'post-1',
          message: '<h1>Title</h1><p>Body</p>',
          media: [],
          settings: { post_type: 'article', article_title: 'Title' },
        },
      ] as never,
      integration
    );

    expect((response as { pendingData: { message: string } }).pendingData.message).toBe(
      '<h1>Title</h1><p>Body</p>'
    );

    upload.mockRestore();
  });

  it('uploads the article cover separately from the body media', async () => {
    const upload = vi
      .spyOn(provider as any, 'uploadMediaEntries')
      .mockResolvedValueOnce({ media: {}, processingIds: [] })
      .mockResolvedValueOnce({ media: { 'article-cover': ['cover-1'] }, processingIds: [] });

    const [response] = await provider.postPending(
      'x-1',
      'token:secret',
      [
        {
          id: 'post-1',
          message: '<p>Body</p>',
          media: [],
          settings: {
            post_type: 'article',
            article_cover: { id: 'm1', path: '/cover.jpg' },
          },
        },
      ] as never,
      integration
    );

    expect(response).toMatchObject({ pendingData: { coverMediaId: 'cover-1' } });

    upload.mockRestore();
  });
});

describe('XProvider.checkPostStatus', () => {
  it('is ready when nothing is transcoding', async () => {
    await expect(provider.checkPostStatus('token:secret', pending(), integration)).resolves.toEqual(
      { status: 'ready', pendingData: { ...pending(), processingIds: [] } }
    );
  });

  it('keeps polling a video X is still transcoding', async () => {
    v2Get.mockResolvedValue({ data: { processing_info: { state: 'in_progress' } } });

    await expect(
      provider.checkPostStatus('token:secret', pending({ processingIds: ['m1'] }), integration)
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('is ready once every video succeeded', async () => {
    v2Get.mockResolvedValue({ data: { processing_info: { state: 'succeeded' } } });

    await expect(
      provider.checkPostStatus('token:secret', pending({ processingIds: ['m1'] }), integration)
    ).resolves.toMatchObject({ status: 'ready', pendingData: { processingIds: [] } });
  });

  it('treats a missing processing_info as ready to use', async () => {
    v2Get.mockResolvedValue({ data: {} });

    await expect(
      provider.checkPostStatus('token:secret', pending({ processingIds: ['m1'] }), integration)
    ).resolves.toMatchObject({ status: 'ready' });
  });

  it('reports the reason X gave for a failed transcode', async () => {
    v2Get.mockResolvedValue({
      data: { processing_info: { state: 'failed', error: { message: 'Unsupported codec' } } },
    });

    const error = await provider
      .checkPostStatus('token:secret', pending({ processingIds: ['m1'] }), integration)
      .catch((e) => e);

    expect(error).toBeInstanceOf(BadBody);
    expect(error.message).toContain('Unsupported codec');
  });

  it('asks for a reconnect when the client reports a 401', async () => {
    // twitter-api-v2 throws its own error type, which never passes through
    // this.fetch - without classifying it here a revoked token would burn the
    // whole check budget as "transient".
    v2Get.mockRejectedValue(Object.assign(new Error('unauthorized'), { code: 401, data: {} }));

    await expect(
      provider.checkPostStatus('token:secret', pending({ processingIds: ['m1'] }), integration)
    ).rejects.toBeInstanceOf(RefreshToken);
  });

  it('fails terminally on a classified client error', async () => {
    v2Get.mockRejectedValue(
      Object.assign(new Error('suspended'), { code: 403, data: { detail: 'user-suspended' } })
    );

    await expect(
      provider.checkPostStatus('token:secret', pending({ processingIds: ['m1'] }), integration)
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('keeps polling through an unclassified client error', async () => {
    v2Get.mockRejectedValue(Object.assign(new Error('gateway'), { code: 502, data: {} }));

    await expect(
      provider.checkPostStatus('token:secret', pending({ processingIds: ['m1'] }), integration)
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('confirms the armed attempt', async () => {
    const armed = pending({ attempting: true, confirmed: false });

    await expect(provider.checkPostStatus('token:secret', armed, integration)).resolves.toEqual({
      status: 'ready',
      pendingData: { ...armed, processingIds: [], confirmed: true },
    });
  });

  it('stops rather than risk a duplicate when a confirmed attempt lost its result', async () => {
    await expect(
      provider.checkPostStatus('token:secret', confirmed(), integration)
    ).rejects.toBeInstanceOf(BadBody);
  });
});

describe('XProvider.finalizePost', () => {
  const created = () => ({ data: { id: '1234' } });

  it('arms the create attempt without touching X', async () => {
    const fetch = stubFetch([]);

    await expect(provider.finalizePost('token:secret', pending(), integration)).resolves.toEqual({
      status: 'pending',
      pendingData: { ...pending(), attempting: true, confirmed: false },
    });
    expect(fetch.calls).toHaveLength(0);
  });

  it('creates the tweet and returns its url', async () => {
    const fetch = stubFetch([['/2/tweets', created]]);

    await expect(
      provider.finalizePost('token:secret', confirmed(), integration)
    ).resolves.toEqual({
      status: 'completed',
      postId: '1234',
      releaseURL: 'https://twitter.com/me/status/1234',
    });

    expect(fetch.body('/2/tweets')).toMatchObject({
      text: 'hello from the test suite',
      made_with_ai: false,
      paid_partnership: false,
    });
  });

  it('omits reply settings when everyone can reply', async () => {
    const fetch = stubFetch([['/2/tweets', created]]);

    await provider.finalizePost(
      'token:secret',
      confirmed({ settings: { who_can_reply_post: 'everyone' } }),
      integration
    );

    expect(fetch.body('/2/tweets').reply_settings).toBeUndefined();
  });

  it('restricts replies when the user chose to', async () => {
    const fetch = stubFetch([['/2/tweets', created]]);

    await provider.finalizePost(
      'token:secret',
      confirmed({ settings: { who_can_reply_post: 'subscribers' } }),
      integration
    );

    expect(fetch.body('/2/tweets').reply_settings).toBe('subscribers');
  });

  it('posts into a community by its trailing id', async () => {
    const fetch = stubFetch([['/2/tweets', created]]);

    await provider.finalizePost(
      'token:secret',
      confirmed({ settings: { community: 'https://x.com/i/communities/98765' } }),
      integration
    );

    expect(fetch.body('/2/tweets')).toMatchObject({
      community_id: '98765',
      share_with_followers: true,
    });
  });

  it('attaches the uploaded media ids', async () => {
    const fetch = stubFetch([['/2/tweets', created]]);

    await provider.finalizePost(
      'token:secret',
      confirmed({ mediaIds: ['m1', '', 'm2'] }),
      integration
    );

    expect(fetch.body('/2/tweets').media).toEqual({ media_ids: ['m1', 'm2'] });
  });

  it('carries the disclosure flags the user set', async () => {
    const fetch = stubFetch([['/2/tweets', created]]);

    await provider.finalizePost(
      'token:secret',
      confirmed({ settings: { made_with_ai: 'true', paid_partnership: true } }),
      integration
    );

    expect(fetch.body('/2/tweets')).toMatchObject({
      made_with_ai: true,
      paid_partnership: true,
    });
  });

  it('strips links from the text when the deployment asks for it', async () => {
    vi.stubEnv('STRIP_LINKS_FROM_X_POSTS', 'true');
    const fetch = stubFetch([['/2/tweets', created]]);

    await provider.finalizePost(
      'token:secret',
      confirmed({ message: 'read this https://long.test/page now' }),
      integration
    );

    expect(fetch.body('/2/tweets').text).not.toContain('https://long.test/page');
  });

  it('signs the request, because X rejects an unsigned OAuth1 call', async () => {
    const fetch = stubFetch([['/2/tweets', created]]);

    await provider.finalizePost('token:secret', confirmed(), integration);

    expect((fetch.calls[0].init.headers as Record<string, string>).Authorization).toContain(
      'OAuth '
    );
  });
});

describe('XProvider.post blocking behaviour', () => {
  it('walks arm, confirm and create in one call', async () => {
    const upload = vi
      .spyOn(provider as any, 'uploadMediaEntries')
      .mockResolvedValue({ media: {}, processingIds: [] });
    const fetch = stubFetch([['/2/tweets', () => ({ data: { id: '1234' } })]]);

    await expect(
      provider.post(
        'x-1',
        'token:secret',
        [{ id: 'post-1', message: 'hello', media: [], settings: {} }] as never,
        integration
      )
    ).resolves.toEqual([
      {
        id: 'post-1',
        postId: '1234',
        releaseURL: 'https://twitter.com/me/status/1234',
        status: 'posted',
      },
    ]);

    expect(fetch.countTo('/2/tweets')).toBe(1);

    upload.mockRestore();
  });

  it('fails rather than letting the activity time out and republish', async () => {
    const upload = vi
      .spyOn(provider as any, 'uploadMediaEntries')
      .mockResolvedValue({ media: {}, processingIds: ['m1'] });
    v2Get.mockResolvedValue({ data: { processing_info: { state: 'in_progress' } } });

    const realNow = Date.now();
    let calls = 0;
    const now = vi.spyOn(Date, 'now').mockImplementation(() => realNow + calls++ * 5 * 60 * 1000);

    await expect(
      provider.post(
        'x-1',
        'token:secret',
        [{ id: 'post-1', message: 'hello', media: [{ path: '/clip.mp4' }], settings: {} }] as never,
        integration
      )
    ).rejects.toBeInstanceOf(BadBody);

    now.mockRestore();
    upload.mockRestore();
  });
});

describe('XProvider.refreshToken', () => {
  it('returns empty credentials, because X uses non-expiring OAuth1 tokens', async () => {
    await expect(provider.refreshToken()).resolves.toMatchObject({
      accessToken: '',
      refreshToken: '',
      expiresIn: 0,
    });
  });
});

describe('XProvider article publishing', () => {
  const article = ({ settings, ...over }: Record<string, unknown> = {}) =>
    confirmed({
      message:
        '<h1>Heading</h1><p>Body with <strong>bold</strong> and <a href="https://x.test">a link</a></p>',
      ...over,
      settings: { post_type: 'article', article_title: 'My article', ...(settings as object) },
    });

  it('creates a draft and stops there when the user chose draft', async () => {
    const fetch = stubFetch([[/\/articles\/draft$/, () => ({ data: { id: 'draft-1' } })]]);

    await expect(
      provider.finalizePost('token:secret', article(), integration)
    ).resolves.toEqual({
      status: 'completed',
      postId: 'draft-1',
      releaseURL: 'https://x.com/i/articles',
    });

    expect(fetch.body(/\/articles\/draft$/).title).toBe('My article');
  });

  it('publishes the draft when the user chose published', async () => {
    const fetch = stubFetch([
      [/\/articles\/draft$/, () => ({ data: { id: 'draft-1' } })],
      ['/publish', () => ({ data: { post_id: '9999' } })],
    ]);

    await expect(
      provider.finalizePost(
        'token:secret',
        article({ settings: { article_status: 'published' } }),
        integration
      )
    ).resolves.toEqual({
      status: 'completed',
      postId: '9999',
      releaseURL: 'https://twitter.com/me/status/9999',
    });

    expect(fetch.urls()[1]).toContain('/articles/draft-1/publish');
  });

  it('fails when X answers the draft without an id', async () => {
    stubFetch([[/\/articles\/draft$/, () => ({ errors: [{ message: 'bad cover' }] })]]);

    // The articles endpoints answer 2xx with an errors array, so a missing id
    // is the only reliable signal that nothing was created.
    await expect(
      provider.finalizePost('token:secret', article(), integration)
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('says the draft survived when only the publish failed', async () => {
    stubFetch([
      [/\/articles\/draft$/, () => ({ data: { id: 'draft-1' } })],
      ['/publish', () => ({ errors: [{ message: 'rejected' }] })],
    ]);

    const error = await provider
      .finalizePost(
        'token:secret',
        article({ settings: { article_status: 'published' } }),
        integration
      )
      .catch((e) => e);

    expect(error).toBeInstanceOf(BadBody);
    expect(error.message).toContain('check your drafts on X');
  });

  it('attaches the cover with the category the upload stored', async () => {
    const fetch = stubFetch([[/\/articles\/draft$/, () => ({ data: { id: 'draft-1' } })]]);

    await provider.finalizePost(
      'token:secret',
      article({ coverMediaId: 'cover-1' }),
      integration
    );

    expect(fetch.body(/\/articles\/draft$/).cover_media).toEqual({
      media_category: 'tweet_image',
      media_id: 'cover-1',
    });
  });

  it('converts the editor html into the draft.js blocks X expects', async () => {
    const fetch = stubFetch([[/\/articles\/draft$/, () => ({ data: { id: 'draft-1' } })]]);

    await provider.finalizePost('token:secret', article(), integration);

    const { blocks, entities } = fetch.body(/\/articles\/draft$/).content_state;
    expect(blocks[0]).toMatchObject({ text: 'Heading', type: 'header-one' });
    // Bold and links survive as ranges rather than as markup in the text.
    const body = blocks.find((b: { text: string }) => b.text.includes('Body with'));
    expect(body.text).not.toContain('<strong>');
    expect(body.inline_style_ranges).toContainEqual(
      expect.objectContaining({ style: 'bold' })
    );
    expect(entities).toContainEqual(
      expect.objectContaining({
        value: expect.objectContaining({ type: 'link', data: { url: 'https://x.test' } }),
      })
    );
  });

  it('embeds the uploaded body media as image blocks', async () => {
    const fetch = stubFetch([[/\/articles\/draft$/, () => ({ data: { id: 'draft-1' } })]]);

    await provider.finalizePost(
      'token:secret',
      article({ mediaIds: ['media-1', 'media-2'] }),
      integration
    );

    const { blocks } = fetch.body(/\/articles\/draft$/).content_state;
    expect(blocks.filter((b: { type: string }) => b.type === 'atomic')).toHaveLength(2);
  });
});

describe('XProvider.comment', () => {
  it('replies to the post when there is no previous comment', async () => {
    const upload = vi.spyOn(provider as any, 'uploadMedia').mockResolvedValue({});
    const fetch = stubFetch([['/2/tweets', () => ({ data: { id: '2222' } })]]);

    await expect(
      provider.comment(
        'x-1',
        '1111',
        undefined,
        'token:secret',
        [{ id: 'c1', message: '<p>a comment</p>', media: [], settings: {} }] as never,
        integration
      )
    ).resolves.toEqual([
      {
        id: 'c1',
        postId: '2222',
        releaseURL: 'https://twitter.com/me/status/2222',
        status: 'posted',
      },
    ]);

    expect(fetch.body('/2/tweets').reply).toEqual({ in_reply_to_tweet_id: '1111' });

    upload.mockRestore();
  });

  it('threads onto the previous comment when there is one', async () => {
    const upload = vi.spyOn(provider as any, 'uploadMedia').mockResolvedValue({});
    const fetch = stubFetch([['/2/tweets', () => ({ data: { id: '3333' } })]]);

    await provider.comment(
      'x-1',
      '1111',
      '2222',
      'token:secret',
      [{ id: 'c2', message: 'another', media: [], settings: {} }] as never,
      integration
    );

    expect(fetch.body('/2/tweets').reply).toEqual({ in_reply_to_tweet_id: '2222' });

    upload.mockRestore();
  });

  it('attaches the media uploaded for the comment', async () => {
    const upload = vi
      .spyOn(provider as any, 'uploadMedia')
      .mockResolvedValue({ c1: ['m1', ''] });
    const fetch = stubFetch([['/2/tweets', () => ({ data: { id: '2222' } })]]);

    await provider.comment(
      'x-1',
      '1111',
      undefined,
      'token:secret',
      [{ id: 'c1', message: 'a comment', media: [{ path: '/a.jpg' }], settings: {} }] as never,
      integration
    );

    expect(fetch.body('/2/tweets').media).toEqual({ media_ids: ['m1'] });

    upload.mockRestore();
  });
});

describe('XProvider plugs', () => {
  const integrationRow = { internalId: 'x-1', token: 'token:secret' } as never;

  it('reposts once the like threshold is reached', async () => {
    tweetLikedBy.mockResolvedValue({ meta: { result_count: 12 } });

    await expect(
      provider.autoRepostPost(integrationRow, '1111', { likesAmount: '10' })
    ).resolves.toBe(true);
    expect(retweet).toHaveBeenCalledWith('x-1', '1111');
  });

  it('does nothing below the threshold, and asks to be run again', async () => {
    tweetLikedBy.mockResolvedValue({ meta: { result_count: 3 } });

    await expect(
      provider.autoRepostPost(integrationRow, '1111', { likesAmount: '10' })
    ).resolves.toBe(false);
    expect(retweet).not.toHaveBeenCalled();
  });

  it('adds the plug reply once the like threshold is reached', async () => {
    tweetLikedBy.mockResolvedValue({ meta: { result_count: 12 } });

    await expect(
      provider.autoPlugPost(integrationRow, '1111', {
        likesAmount: '10',
        post: '<p>and here is more</p>',
      })
    ).resolves.toBe(true);

    expect(tweet).toHaveBeenCalledWith({
      text: 'and here is more',
      reply: { in_reply_to_tweet_id: '1111' },
    });
  });

  it('does not plug below the threshold', async () => {
    tweetLikedBy.mockResolvedValue({ meta: { result_count: 1 } });

    await expect(
      provider.autoPlugPost(integrationRow, '1111', { likesAmount: '10', post: 'x' })
    ).resolves.toBe(false);
    expect(tweet).not.toHaveBeenCalled();
  });

  it('reposts a post from another connected account', async () => {
    me.mockResolvedValue({ data: { id: 'other-user' } });

    await provider.repostPostUsers(integrationRow, integrationRow, '1111', {});

    expect(retweet).toHaveBeenCalledWith('other-user', '1111');
  });

  it('ignores a repost that X refuses', async () => {
    me.mockResolvedValue({ data: { id: 'other-user' } });
    retweet.mockRejectedValue(new Error('already retweeted'));

    // A failed repost must never fail the plug run for everyone else.
    await expect(
      provider.repostPostUsers(integrationRow, integrationRow, '1111', {})
    ).resolves.toBeUndefined();
  });
});

describe('XProvider authentication', () => {
  it('builds the auth link and carries both oauth tokens through', async () => {
    vi.stubEnv('X_URL', 'https://app.test');
    generateAuthLink.mockResolvedValue({
      url: 'https://api.x.com/oauth/authenticate?oauth_token=t',
      oauth_token: 't',
      oauth_token_secret: 's',
    });

    await expect(provider.generateAuthUrl()).resolves.toEqual({
      url: 'https://api.x.com/oauth/authenticate?oauth_token=t',
      // OAuth1 needs the secret back on the callback, so it travels in the
      // verifier rather than being stored separately.
      codeVerifier: 't:s',
      state: 't',
    });
    expect(generateAuthLink).toHaveBeenCalledWith(
      'https://app.test/integrations/social/x',
      expect.objectContaining({ authAccessType: 'write' })
    );
  });

  it('stores the token pair and the premium flag on connect', async () => {
    login.mockResolvedValue({
      accessToken: 'at',
      accessSecret: 'as',
      client: { v2: { me: meWithFields } },
    });
    meWithFields.mockResolvedValue({
      data: {
        id: 42,
        username: 'me',
        name: 'Me',
        verified: true,
        profile_image_url: 'https://pic.test',
      },
    });

    await expect(
      provider.authenticate({ code: 'verifier-code', codeVerifier: 't:s' })
    ).resolves.toMatchObject({
      id: '42',
      // The colon-joined pair is what signOAuth1 splits back apart on
      // every later request.
      accessToken: 'at:as',
      username: 'me',
      picture: 'https://pic.test',
      additionalSettings: [expect.objectContaining({ title: 'Verified', value: true })],
    });
  });
});

describe('XProvider.analytics', () => {
  it('returns nothing when the deployment disabled X analytics', async () => {
    vi.stubEnv('DISABLE_X_ANALYTICS', 'true');

    await expect(provider.analytics('x-1', 'token:secret', 30)).resolves.toEqual([]);
    expect(userTimeline).not.toHaveBeenCalled();
  });

  it('sums the public metrics of the timeline', async () => {
    userTimeline.mockResolvedValue({
      tweets: [{ id: '1' }, { id: '2' }],
      meta: {},
    });
    tweets.mockResolvedValue({
      data: [
        {
          public_metrics: {
            impression_count: 100,
            bookmark_count: 1,
            like_count: 10,
            quote_count: 2,
            reply_count: 3,
            retweet_count: 4,
          },
        },
        {
          public_metrics: {
            impression_count: 50,
            bookmark_count: 0,
            like_count: 5,
            quote_count: 0,
            reply_count: 1,
            retweet_count: 0,
          },
        },
      ],
    });

    const result = await provider.analytics('x-1', 'token:secret', 30);
    const byLabel = Object.fromEntries(result.map((r) => [r.label, r.data.at(-1)!.total]));

    expect(byLabel).toMatchObject({ IMPRESSION: '150', LIKE: '15', REPLY: '4' });
  });

  it('returns nothing for an account with no tweets in the window', async () => {
    userTimeline.mockResolvedValue({ tweets: [], meta: {} });

    await expect(provider.analytics('x-1', 'token:secret', 30)).resolves.toEqual([]);
  });

  it('returns nothing rather than breaking the dashboard', async () => {
    userTimeline.mockRejectedValue(new Error('rate limited'));

    await expect(provider.analytics('x-1', 'token:secret', 30)).resolves.toEqual([]);
  });
});

describe('XProvider.postAnalytics', () => {
  it('reports the metrics of one post', async () => {
    singleTweet.mockResolvedValue({
      data: {
        public_metrics: {
          impression_count: 100,
          like_count: 10,
          reply_count: 2,
          retweet_count: 3,
        },
      },
    });

    const labels = (await provider.postAnalytics('x-1', 'token:secret', '1111', 7)).map(
      (r) => r.label
    );

    expect(labels).toContain('Impressions');
    expect(labels).toContain('Likes');
  });

  it('returns nothing for a post X has no metrics for', async () => {
    singleTweet.mockResolvedValue({ data: {} });

    await expect(provider.postAnalytics('x-1', 'token:secret', '1111', 7)).resolves.toEqual([]);
  });

  it('returns nothing when analytics are disabled', async () => {
    vi.stubEnv('DISABLE_X_ANALYTICS', 'true');

    await expect(provider.postAnalytics('x-1', 'token:secret', '1111', 7)).resolves.toEqual([]);
    expect(singleTweet).not.toHaveBeenCalled();
  });
});

describe('XProvider.mention', () => {
  it('resolves a handle to a mention entry', async () => {
    userByUsername.mockResolvedValue({
      data: { username: 'someone', name: 'Some One', profile_image_url: 'https://pic.test' },
    });

    await expect(provider.mention('token:secret', { query: 'someone' })).resolves.toEqual([
      { id: 'someone', image: 'https://pic.test', label: 'Some One' },
    ]);
  });

  it('returns nothing for a handle X does not know', async () => {
    userByUsername.mockResolvedValue({ data: {} });

    await expect(provider.mention('token:secret', { query: 'nobody' })).resolves.toEqual([]);
  });

  it('returns nothing rather than failing the editor', async () => {
    userByUsername.mockRejectedValue(new Error('rate limited'));

    await expect(provider.mention('token:secret', { query: 'someone' })).resolves.toEqual([]);
  });

  it('formats a mention as a plain handle', () => {
    expect(provider.mentionFormat('someone', 'Some One')).toBe('@someone');
  });
});

describe('XProvider media upload', () => {
  const client = () => new (TwitterApi as never as new () => never)();

  const png = () =>
    sharp({ create: { width: 4, height: 4, channels: 3, background: '#00ff00' } })
      .png()
      .toBuffer();

  it('uploads an image as a gif, which is what the tweet pipeline expects', async () => {
    readOrFetch.mockResolvedValue(await png());
    uploadMedia.mockResolvedValue('media-1');

    const result = await (provider as any).uploadMediaEntries(
      client(),
      [{ id: 'p1', media: [{ path: 'https://media.test/a.png' }] }]
    );

    expect(result).toEqual({ media: { p1: ['media-1'] }, processingIds: [] });
    expect(uploadMedia.mock.calls[0][1]).toMatchObject({ media_type: 'image/png' });
  });

  it('uploads an article image as jpeg with the category articles reference', async () => {
    readOrFetch.mockResolvedValue(await png());
    uploadMedia.mockResolvedValue('media-1');

    await (provider as any).uploadMediaEntries(
      client(),
      [{ id: 'p1', media: [{ path: 'https://media.test/a.png' }] }],
      true
    );

    // Articles reject GIF outright, so the tweet pipeline cannot be reused.
    expect(uploadMedia.mock.calls[0][1]).toEqual({
      media_type: 'image/jpeg',
      media_category: 'tweet_image',
    });
  });

  it('uploads a video in chunks and reports it as still transcoding', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit = {}) =>
        init.method === 'HEAD'
          ? new Response(null, { status: 200, headers: { 'content-length': '100' } })
          : new Response('x'.repeat(100), { status: 206 })
      )
    );
    v2Post
      .mockResolvedValueOnce({ data: { id: 'media-9' } })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ data: { id: 'media-9', processing_info: { state: 'pending' } } });

    const result = await (provider as any).uploadMediaEntries(
      client(),
      [{ id: 'p1', media: [{ path: 'https://media.test/clip.mp4' }] }]
    );

    expect(result).toEqual({ media: { p1: ['media-9'] }, processingIds: ['media-9'] });
    expect(v2Post.mock.calls[0][0]).toBe('media/upload/initialize');
    expect(v2Post.mock.calls[1][0]).toBe('media/upload/media-9/append');
    expect(v2Post.mock.calls[2][0]).toBe('media/upload/media-9/finalize');
  });

  it('treats a missing processing_info at finalize as ready to attach', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit = {}) =>
        init.method === 'HEAD'
          ? new Response(null, { status: 200, headers: { 'content-length': '10' } })
          : new Response('x'.repeat(10), { status: 206 })
      )
    );
    v2Post
      .mockResolvedValueOnce({ data: { id: 'media-9' } })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ data: { id: 'media-9' } });

    const result = await (provider as any).uploadMediaEntries(
      client(),
      [{ id: 'p1', media: [{ path: 'https://media.test/clip.mp4' }] }]
    );

    expect(result.processingIds).toEqual([]);
  });

  it('fails when X rejects the video at finalize', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit = {}) =>
        init.method === 'HEAD'
          ? new Response(null, { status: 200, headers: { 'content-length': '10' } })
          : new Response('x'.repeat(10), { status: 206 })
      )
    );
    v2Post
      .mockResolvedValueOnce({ data: { id: 'media-9' } })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        data: {
          id: 'media-9',
          processing_info: { state: 'failed', error: { message: 'Unsupported codec' } },
        },
      });

    await expect(
      (provider as any).uploadMediaEntries(client(), [
        { id: 'p1', media: [{ path: 'https://media.test/clip.mp4' }] },
      ])
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('retries an upload X rate limited, because nothing is published yet', async () => {
    readOrFetch.mockResolvedValue(await png());
    uploadMedia
      .mockRejectedValueOnce(Object.assign(new Error('too many'), { code: 429 }))
      .mockResolvedValueOnce('media-1');

    const result = await (provider as any).uploadMediaEntries(
      client(),
      [{ id: 'p1', media: [{ path: 'https://media.test/a.png' }] }]
    );

    expect(result.media.p1).toEqual(['media-1']);
    expect(uploadMedia).toHaveBeenCalledTimes(2);
  });

  it('gives up once the rate-limit retries are exhausted', async () => {
    readOrFetch.mockResolvedValue(await png());
    uploadMedia.mockRejectedValue(Object.assign(new Error('too many'), { rateLimitError: true }));

    await expect(
      (provider as any).uploadMediaEntries(client(), [
        { id: 'p1', media: [{ path: 'https://media.test/a.png' }] },
      ])
    ).rejects.toBeTruthy();
    expect(uploadMedia).toHaveBeenCalledTimes(4);
  });

  it('skips an entry the upload returned no id for', async () => {
    readOrFetch.mockResolvedValue(await png());
    uploadMedia.mockResolvedValue(undefined);

    await expect(
      (provider as any).uploadMediaEntries(client(), [
        { id: 'p1', media: [{ path: 'https://media.test/a.png' }] },
      ])
    ).resolves.toEqual({ media: {}, processingIds: [] });
  });

  it('handles a post with no media at all', async () => {
    await expect(
      (provider as any).uploadMediaEntries(client(), [{ id: 'p1' }])
    ).resolves.toEqual({ media: {}, processingIds: [] });
  });
});

describe('XProvider.waitForMediaProcessing', () => {
  const client = () => new (TwitterApi as never as new () => never)();

  it('returns as soon as the media succeeded', async () => {
    v2Get.mockResolvedValue({ data: { processing_info: { state: 'succeeded' } } });

    await expect(
      (provider as any).waitForMediaProcessing(client(), 'media-1')
    ).resolves.toBeUndefined();
  });

  it('returns immediately when there is nothing to process', async () => {
    v2Get.mockResolvedValue({ data: {} });

    await expect(
      (provider as any).waitForMediaProcessing(client(), 'media-1')
    ).resolves.toBeUndefined();
  });

  it('polls at the pace X asks for, then returns', async () => {
    const { timer } = await import('@gitroom/helpers/utils/timer');
    v2Get
      .mockResolvedValueOnce({
        data: { processing_info: { state: 'in_progress', check_after_secs: 5 } },
      })
      .mockResolvedValueOnce({ data: { processing_info: { state: 'succeeded' } } });

    await (provider as any).waitForMediaProcessing(client(), 'media-1');

    expect(timer).toHaveBeenCalledWith(5000);
  });

  it('fails with the reason X gave', async () => {
    v2Get.mockResolvedValue({
      data: { processing_info: { state: 'failed', error: { message: 'Bad codec' } } },
    });

    const error = await (provider as any)
      .waitForMediaProcessing(client(), 'media-1')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadBody);
    expect(error.message).toContain('Bad codec');
  });

  it('gives up rather than polling forever', async () => {
    v2Get.mockResolvedValue({
      data: { processing_info: { state: 'in_progress', check_after_secs: 120 } },
    });

    // A video stuck in_progress would otherwise hold the activity open until
    // Temporal times it out, and a retried activity re-uploads.
    await expect(
      (provider as any).waitForMediaProcessing(client(), 'media-1')
    ).rejects.toBeInstanceOf(BadBody);
  });
});
