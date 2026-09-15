vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody, RefreshToken } from '../social.abstract';
import { RedditProvider } from './reddit.provider';

const provider = new RedditProvider();
const integration = { internalId: 'u1', profile: 'me' } as never;

const subreddit = (over: Record<string, unknown> = {}) => ({
  value: { subreddit: '/r/test', title: 'A title', type: 'self', ...over },
});

const pending = (over: Record<string, unknown> = {}) => ({
  subreddits: [subreddit()],
  message: 'hello from the test suite',
  cursor: 0,
  results: [],
  ...over,
});

const armed = (over: Record<string, unknown> = {}) => ({
  sr: 'test',
  title: 'A title',
  armedAt: Date.now(),
  media: false,
  submitted: false,
  lookups: 0,
  ...over,
});

const listing = (children: Record<string, unknown>[]) => ({
  data: { children: children.map((data) => ({ data })) },
});

describe('RedditProvider.checkValidity', () => {
  it('requires exactly one media for a media post', async () => {
    await expect(
      provider.checkValidity([[]], { subreddit: [subreddit({ type: 'media' })] })
    ).resolves.toBe('When posting a media post, you must attached exactly one media file.');
  });

  it('accepts a media post with one file', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }]], { subreddit: [subreddit({ type: 'media' })] })
    ).resolves.toBe(true);
  });

  it('requires a thumbnail on a video post', async () => {
    await expect(provider.checkValidity([[{ path: '/clip.mp4' }]], {})).resolves.toBe(
      'You must attach a thumbnail to your video post.'
    );
  });

  it('accepts a video that has a thumbnail', async () => {
    await expect(
      provider.checkValidity([[{ path: '/clip.mp4', thumbnail: '/t.jpg' }]], {})
    ).resolves.toBe(true);
  });
});

describe('RedditProvider.postPending', () => {
  it('submits nothing and hands the subreddit list to the workflow', async () => {
    const fetch = stubFetch([]);

    const [response] = await provider.postPending('u1', 'token', [
      {
        id: 'post-1',
        message: 'hello',
        media: [{ path: '/a.jpg', thumbnail: '/t.jpg' }],
        settings: { subreddit: [subreddit(), subreddit()] },
      },
    ] as never);

    // The old code restarted from the first subreddit on a retry and posted
    // every already-published one again.
    expect(response).toMatchObject({
      status: 'pending',
      pendingData: { cursor: 0, results: [], mediaPath: '/a.jpg', mediaThumbnail: '/t.jpg' },
    });
    expect(fetch.calls).toHaveLength(0);
  });
});

describe('RedditProvider.checkPostStatus arming', () => {
  it('arms the subreddit at the cursor before anything is submitted', async () => {
    const result = await provider.checkPostStatus('token', pending() as never, integration);

    expect(result).toMatchObject({
      status: 'ready',
      pendingData: {
        armed: expect.objectContaining({ sr: 'test', title: 'A title', submitted: false }),
      },
    });
  });

  it('normalises the subreddit name it arms', async () => {
    const result = await provider.checkPostStatus(
      'token',
      pending({ subreddits: [subreddit({ subreddit: '/r/TestSub' })] }) as never,
      integration
    );

    expect((result as { pendingData: { armed: { sr: string } } }).pendingData.armed.sr).toBe(
      'testsub'
    );
  });

  it('completes once every subreddit is published', async () => {
    await expect(
      provider.checkPostStatus(
        'token',
        pending({
          cursor: 1,
          results: [{ postId: 'p1', releaseURL: 'https://reddit.test/1' }],
        }) as never,
        integration
      )
    ).resolves.toEqual({
      status: 'completed',
      postId: 'p1',
      releaseURL: 'https://reddit.test/1',
    });
  });

  it('joins the ids of every subreddit it published', async () => {
    await expect(
      provider.checkPostStatus(
        'token',
        pending({
          subreddits: [subreddit(), subreddit()],
          cursor: 2,
          results: [
            { postId: 'p1', releaseURL: 'https://reddit.test/1' },
            { postId: 'p2', releaseURL: 'https://reddit.test/2' },
          ],
        }) as never,
        integration
      )
    ).resolves.toMatchObject({ postId: 'p1,p2', releaseURL: 'https://reddit.test/1,https://reddit.test/2' });
  });
});

describe('RedditProvider.checkPostStatus recovery', () => {
  it('adopts a submission it finds in the listing instead of resubmitting', async () => {
    stubFetch([
      [
        '/submitted',
        () =>
          listing([
            {
              id: 'abc',
              subreddit: 'test',
              title: 'A title',
              created_utc: Date.now() / 1000,
              permalink: '/r/test/comments/abc',
            },
          ]),
      ],
    ]);

    const result = await provider.checkPostStatus(
      'token',
      pending({ subreddits: [subreddit(), subreddit()], armed: armed() }) as never,
      integration
    );

    expect(result).toMatchObject({
      pendingData: {
        cursor: 1,
        results: [{ postId: 'abc', releaseURL: 'https://www.reddit.com/r/test/comments/abc' }],
      },
    });
  });

  it('ignores an older post with the same title in the same subreddit', async () => {
    stubFetch([
      [
        '/submitted',
        () =>
          listing([
            {
              id: 'old',
              subreddit: 'test',
              title: 'A title',
              created_utc: (Date.now() - 24 * 60 * 60 * 1000) / 1000,
              permalink: '/r/test/comments/old',
            },
          ]),
      ],
    ]);

    // An earlier schedule or a template repost must never be mistaken for this
    // attempt - it would silently skip a subreddit the user asked for.
    const result = await provider.checkPostStatus(
      'token',
      pending({ armed: armed({ lookups: 0 }) }) as never,
      integration
    );

    expect(result).toMatchObject({ status: 'pending' });
  });

  it('keeps looking for the id of an accepted media submit', async () => {
    stubFetch([['/submitted', () => listing([])]]);

    const result = await provider.checkPostStatus(
      'token',
      pending({ armed: armed({ media: true, submitted: true, lookups: 3 }) }) as never,
      integration
    );

    expect(result).toMatchObject({
      status: 'pending',
      pendingData: { armed: expect.objectContaining({ lookups: 4 }) },
    });
  });

  it('accepts an id-less result rather than resubmitting an accepted media post', async () => {
    stubFetch([['/submitted', () => listing([])]]);

    // Reddit accepted this submit; posting again is a visible duplicate, a
    // missing id only costs comments and webhooks.
    const result = await provider.checkPostStatus(
      'token',
      pending({
        subreddits: [subreddit(), subreddit()],
        armed: armed({ media: true, submitted: true, lookups: 9 }),
      }) as never,
      integration
    );

    expect(result).toMatchObject({
      pendingData: {
        cursor: 1,
        results: [{ postId: '', releaseURL: 'https://www.reddit.com/r/test' }],
      },
    });
  });

  it('holds a timed-out media submit inside the in-flight window', async () => {
    stubFetch([['/submitted', () => listing([])]]);

    // The activity that timed out may still be running and its submit can
    // surface minutes later; authorising a resubmit now duplicates the post.
    const result = await provider.checkPostStatus(
      'token',
      pending({ armed: armed({ media: true, lookups: 0 }) }) as never,
      integration
    );

    expect(result).toMatchObject({ status: 'pending' });
  });

  it('lets a media submit be retried once the in-flight window and lookups are exhausted', async () => {
    stubFetch([['/submitted', () => listing([])]]);

    const result = await provider.checkPostStatus(
      'token',
      pending({
        armed: armed({
          media: true,
          lookups: 9,
          armedAt: Date.now() - 11 * 60 * 1000,
        }),
      }) as never,
      integration
    );

    expect(result).toMatchObject({
      status: 'ready',
      pendingData: { armed: expect.objectContaining({ lookups: 0 }) },
    });
  });

  it('gives a self post exactly one grace miss for listing lag', async () => {
    stubFetch([['/submitted', () => listing([])]]);

    await expect(
      provider.checkPostStatus('token', pending({ armed: armed() }) as never, integration)
    ).resolves.toMatchObject({ status: 'pending' });

    await expect(
      provider.checkPostStatus(
        'token',
        pending({ armed: armed({ lookups: 1 }) }) as never,
        integration
      )
    ).resolves.toMatchObject({ status: 'ready' });
  });

  it('surfaces an expired token rather than treating it as a missing submission', async () => {
    stubFetch([
      ['/submitted', () => Response.json({ message: 'Unauthorized' }, { status: 401 })],
    ]);

    await expect(
      provider.checkPostStatus('token', pending({ armed: armed() }) as never, integration)
    ).rejects.toBeInstanceOf(RefreshToken);
  });

  it('consumes the grace budget when the listing itself is broken', async () => {
    stubFetch([
      ['/submitted', () => Response.json({ message: 'server error' }, { status: 500 })],
    ]);

    // A permanently broken listing must not wedge the post in pending until
    // the whole check budget burns down.
    await expect(
      provider.checkPostStatus(
        'token',
        pending({ armed: armed({ lookups: 1 }) }) as never,
        integration
      )
    ).resolves.toMatchObject({ status: 'ready' });
  });

  it('skips the listing entirely for a channel with no stored username', async () => {
    const fetch = stubFetch([]);

    await expect(
      provider.checkPostStatus(
        'token',
        pending({ armed: armed({ lookups: 1 }) }) as never,
        { internalId: 'u1' } as never
      )
    ).resolves.toMatchObject({ status: 'ready' });
    expect(fetch.calls).toHaveLength(0);
  });
});

describe('RedditProvider.finalizePost', () => {
  const readyToSubmit = (over: Record<string, unknown> = {}) =>
    pending({ armed: armed({ lookups: 1 }), ...over });

  it('hands back to the check when nothing is armed', async () => {
    const fetch = stubFetch([]);

    await expect(
      provider.finalizePost('token', pending() as never, integration)
    ).resolves.toMatchObject({ status: 'pending' });
    expect(fetch.calls).toHaveLength(0);
  });

  it('submits a self post and records its id', async () => {
    const fetch = stubFetch([
      [
        '/api/submit',
        () => ({ json: { errors: [], data: { id: 'abc', url: 'https://reddit.test/abc' } } }),
      ],
    ]);

    await expect(
      provider.finalizePost('token', readyToSubmit() as never, integration)
    ).resolves.toEqual({
      status: 'completed',
      postId: 'abc',
      releaseURL: 'https://reddit.test/abc',
    });

    expect(String(fetch.calls[0].init.body)).toContain('sr=test');
    expect(String(fetch.calls[0].init.body)).toContain('kind=self');
  });

  it('publishes one subreddit per call and leaves the rest pending', async () => {
    const fetch = stubFetch([
      ['/api/submit', () => ({ json: { errors: [], data: { id: 'abc', url: 'u' } } })],
    ]);

    const result = await provider.finalizePost(
      'token',
      readyToSubmit({ subreddits: [subreddit(), subreddit()] }) as never,
      integration
    );

    expect(fetch.countTo('/api/submit')).toBe(1);
    expect(result).toMatchObject({
      status: 'pending',
      pendingData: { cursor: 1, armed: undefined },
    });
  });

  it('attaches the url of a link post', async () => {
    const fetch = stubFetch([
      ['/api/submit', () => ({ json: { errors: [], data: { id: 'abc', url: 'u' } } })],
    ]);

    await provider.finalizePost(
      'token',
      readyToSubmit({
        subreddits: [subreddit({ type: 'link', url: 'https://example.test' })],
      }) as never,
      integration
    );

    expect(String(fetch.calls[0].init.body)).toContain(
      `url=${encodeURIComponent('https://example.test')}`
    );
  });

  it('attaches the flair when one is chosen', async () => {
    const fetch = stubFetch([
      ['/api/submit', () => ({ json: { errors: [], data: { id: 'abc', url: 'u' } } })],
    ]);

    await provider.finalizePost(
      'token',
      readyToSubmit({ subreddits: [subreddit({ flair: { id: 'flair-1' } })] }) as never,
      integration
    );

    expect(String(fetch.calls[0].init.body)).toContain('flair_id=flair-1');
  });

  it('marks a media submit accepted and waits for the listing instead of the websocket', async () => {
    const upload = vi
      .spyOn<any, any>(provider as any, 'uploadFileToReddit')
      .mockResolvedValue('https://reddit.test/asset.jpg');
    stubFetch([['/api/submit', () => ({ json: { errors: [], data: { websocket_url: 'wss://x' } } })]]);

    const result = await provider.finalizePost(
      'token',
      readyToSubmit({
        subreddits: [subreddit({ type: 'media' })],
        mediaPath: '/a.jpg',
        armed: armed({ media: true, lookups: 1 }),
      }) as never,
      integration
    );

    // Holding a websocket open inside an activity is what made this hang.
    expect(result).toMatchObject({
      status: 'pending',
      pendingData: { armed: expect.objectContaining({ submitted: true }) },
    });

    upload.mockRestore();
  });

  it('uploads a poster alongside a video', async () => {
    const upload = vi
      .spyOn<any, any>(provider as any, 'uploadFileToReddit')
      .mockResolvedValue('https://reddit.test/asset');
    const fetch = stubFetch([
      ['/api/submit', () => ({ json: { errors: [], data: { websocket_url: 'wss://x' } } })],
    ]);

    await provider.finalizePost(
      'token',
      readyToSubmit({
        subreddits: [subreddit({ type: 'media' })],
        mediaPath: '/clip.mp4',
        mediaThumbnail: '/t.jpg',
        armed: armed({ media: true, lookups: 1 }),
      }) as never,
      integration
    );

    expect(upload).toHaveBeenCalledTimes(2);
    expect(String(fetch.calls[0].init.body)).toContain('video_poster_url');
    expect(String(fetch.calls[0].init.body)).toContain('kind=video');

    upload.mockRestore();
  });

  it('reports a rejection Reddit answered with a 200 as a terminal failure', async () => {
    stubFetch([
      [
        '/api/submit',
        () => ({ json: { errors: [['NO_TEXT', 'we need something here']], data: {} } }),
      ],
    ]);

    // Reddit rejects with HTTP 200 and an errors array; without this the post
    // would fail later with an unexplained outcome.
    await expect(
      provider.finalizePost('token', readyToSubmit() as never, integration)
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('keeps a SUBREDDIT_NOEXIST rejection retryable', async () => {
    stubFetch([
      [
        '/api/submit',
        () => ({ json: { errors: [['SUBREDDIT_NOEXIST', 'that subreddit does not exist']] } }),
      ],
    ]);

    // Reddit answers this for subreddits that do exist and accept the same
    // submission minutes later, so it must not be terminal.
    const error = await provider
      .finalizePost('token', readyToSubmit() as never, integration)
      .catch((e) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(BadBody);
    expect(error.message).toContain('Reddit rejected the post to r/test');
  });
});

describe('RedditProvider.refreshToken', () => {
  it('exchanges the refresh token and reads the profile back', async () => {
    stubFetch([
      ['/api/v1/access_token', () => ({ access_token: 'fresh', expires_in: 3600 })],
      ['/api/v1/me', () => ({ id: 'u1', name: 'me', icon_img: 'https://pic.test?width=1' })],
    ]);
    vi.stubEnv('REDDIT_CLIENT_ID', 'client');
    vi.stubEnv('REDDIT_CLIENT_SECRET', 'secret');

    await expect(provider.refreshToken('old')).resolves.toMatchObject({
      id: 'u1',
      name: 'me',
      accessToken: 'fresh',
      refreshToken: 'old',
      // Reddit appends resize query parameters that break the stored avatar.
      picture: 'https://pic.test',
      username: 'me',
    });
  });
});
