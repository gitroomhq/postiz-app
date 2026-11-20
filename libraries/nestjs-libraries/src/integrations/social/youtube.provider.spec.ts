vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

const g = vi.hoisted(() => ({
  setCredentials: vi.fn(),
  getToken: vi.fn(),
  getTokenInfo: vi.fn(),
  refreshAccessToken: vi.fn(),
  generateAuthUrl: vi.fn(() => 'https://accounts.google.test/o/oauth2/auth'),
  userinfoGet: vi.fn(),
  channelsList: vi.fn(),
  videosList: vi.fn(),
  thumbnailsSet: vi.fn(async () => ({})),
  reportsQuery: vi.fn(),
}));

// The provider talks to Google through the googleapis clients rather than
// this.fetch, so the library is the seam for everything but the raw uploads.
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: class {
        setCredentials = g.setCredentials;
        getToken = g.getToken;
        getTokenInfo = g.getTokenInfo;
        refreshAccessToken = g.refreshAccessToken;
        generateAuthUrl = g.generateAuthUrl;
      },
    },
    youtube: () => ({
      channels: { list: g.channelsList },
      videos: { list: g.videosList },
      thumbnails: { set: g.thumbnailsSet },
    }),
    youtubeAnalytics: () => ({ reports: { query: g.reportsQuery } }),
    oauth2: () => ({ userinfo: { get: g.userinfoGet } }),
  },
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody, NotEnoughScopes, RefreshToken } from '../social.abstract';
import { YoutubeProvider } from './youtube.provider';

const provider = new YoutubeProvider();
const integration = { internalId: 'yt-1' } as never;

const UPLOAD_URI = 'https://upload.youtube.test/session/1';
const MEDIA = 'https://cdn.example.test/clip.mp4';

const pending = (over: Record<string, unknown> = {}) => ({
  uploadUri: UPLOAD_URI,
  videoSize: 1000,
  path: MEDIA,
  uploadedBytes: 0,
  thumbnail: '',
  ...over,
});

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'the description',
  media: [{ path: MEDIA }],
  settings: { title: 'A title', type: 'public' },
  ...over,
});

/** A 308 carries the committed range, which is how the session reports progress. */
const resumeAt = (lastByte: number | null) =>
  new Response(null, {
    status: 308,
    headers: lastByte === null ? {} : { range: `bytes=0-${lastByte}` },
  });

const isProbe = (init: RequestInit) =>
  String((init.headers as any)?.['Content-Range'] || '').startsWith('bytes */');

describe('YoutubeProvider basics', () => {
  it('caps the description at the youtube limit', () => {
    expect(provider.maxLength()).toBe(5000);
  });

  it('requires exactly one media', async () => {
    await expect(provider.checkValidity([[]])).resolves.toBe('You need one media');
    await expect(
      provider.checkValidity([[{ path: '/a.mp4' }, { path: '/b.mp4' }] as never])
    ).resolves.toBe('You need one media');
  });

  it('refuses anything that is not a video', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }] as never])
    ).resolves.toBe('Item must be a video');
  });

  it('accepts a single video', async () => {
    await expect(
      provider.checkValidity([[{ path: '/clip.mp4' }] as never])
    ).resolves.toBe(true);
  });
});

describe('YoutubeProvider.handleErrors', () => {
  it.each([
    ['invalidTags', 'bad-body', /maximum allowed is 500 characters/],
    ['invalidTitle', 'bad-body', /Title is too long/],
    ['invalidDescription', 'bad-body', /description is invalid/],
    ['invalidCategoryId', 'bad-body', /category is invalid/],
    ['invalidPublishAt', 'bad-body', /scheduled publishing time is invalid/],
    ['invalidRecordingDetails', 'bad-body', /recording details/],
    ['invalidVideoGameRating', 'bad-body', /game rating is invalid/],
    ['invalidFilename', 'bad-body', /file name is invalid/],
    ['defaultLanguageNotSet', 'bad-body', /no default language is set/],
    ['invalidVideoMetadata', 'bad-body', /review the title, description and tags/],
    ['mediaBodyRequired', 'bad-body', /video file is missing/],
    ['imageFormatUnsupported', 'bad-body', /thumbnail format is not supported/],
    ['imageTooTall', 'bad-body', /thumbnail image is too tall/],
    ['imageTooWide', 'bad-body', /thumbnail image is too wide/],
    ['rateLimitExceeded', 'bad-body', /sending requests too quickly/],
    ['failedPrecondition', 'bad-body', /Thumbnail size is too large/],
    ['uploadLimitExceeded', 'bad-body', /daily upload limit/],
    ['youtubeSignupRequired', 'bad-body', /link your youtube account/],
    ['youtube.thumbnail', 'bad-body', /phone-verified YouTube channel/],
    ['"forbidden"', 'bad-body', /refused the upload for this channel/],
    ['Unauthorized', 'refresh-token', /reconnect your YouTube account/],
    ['UNAUTHENTICATED', 'refresh-token', /re-authenticate your YouTube account/],
    ['invalid_grant', 'refresh-token', /re-authenticate your YouTube account/],
  ] as [string, string, RegExp][])(
    'maps %s to a %s failure',
    (body, type, value) => {
      expect(provider.handleErrors(body)).toEqual({
        type,
        value: expect.stringMatching(value),
      });
    }
  );

  it('leaves an unrecognised body unclassified', () => {
    expect(provider.handleErrors('something else entirely')).toBeUndefined();
  });
});

describe('YoutubeProvider authentication', () => {
  it('exchanges a refresh token and reports the remaining lifetime', async () => {
    g.refreshAccessToken.mockResolvedValue({
      credentials: {
        access_token: 'at-new',
        refresh_token: 'rt-new',
        expiry_date: Date.now() + 3600 * 1000,
      },
    });
    g.userinfoGet.mockResolvedValue({
      data: { id: 'u1', name: 'Dana', picture: 'https://pic' },
    });

    const result = await provider.refreshToken('rt-old');

    expect(result).toMatchObject({
      accessToken: 'at-new',
      refreshToken: 'rt-new',
      id: 'u1',
      name: 'Dana',
      picture: 'https://pic',
      username: '',
    });
    expect(result.expiresIn).toBeGreaterThan(3500);
  });

  it('keeps the old refresh token when google does not return a new one', async () => {
    g.refreshAccessToken.mockResolvedValue({
      credentials: { access_token: 'at', expiry_date: Date.now() + 1000 },
    });
    g.userinfoGet.mockResolvedValue({ data: { id: 'u1', name: 'Dana' } });

    await expect(provider.refreshToken('rt-old')).resolves.toMatchObject({
      refreshToken: 'rt-old',
      picture: '',
    });
  });

  it('asks for offline consent so a refresh token is issued', async () => {
    const { url, state, codeVerifier } = await provider.generateAuthUrl();

    expect(url).toBe('https://accounts.google.test/o/oauth2/auth');
    expect(state).toEqual(expect.any(String));
    expect(codeVerifier).toEqual(expect.any(String));
    expect(g.generateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({ access_type: 'offline', prompt: 'consent' })
    );
  });

  it('completes the code exchange and returns the channel owner', async () => {
    g.getToken.mockResolvedValue({
      tokens: {
        access_token: 'at',
        refresh_token: 'rt',
        expiry_date: Date.now() + 3600 * 1000,
      },
    });
    g.getTokenInfo.mockResolvedValue({ scopes: provider.scopes.slice(0) });
    g.userinfoGet.mockResolvedValue({
      data: { id: 'u1', name: 'Dana', picture: 'https://pic' },
    });

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).resolves.toMatchObject({ accessToken: 'at', refreshToken: 'rt', id: 'u1' });
  });

  it('refuses a consent that dropped one of the required scopes', async () => {
    g.getToken.mockResolvedValue({
      tokens: { access_token: 'at', refresh_token: 'rt', expiry_date: Date.now() },
    });
    g.getTokenInfo.mockResolvedValue({ scopes: ['https://www.googleapis.com/auth/youtube'] });

    await expect(
      provider.authenticate({ code: 'c', codeVerifier: 'v' })
    ).rejects.toBeInstanceOf(NotEnoughScopes);
  });
});

describe('YoutubeProvider channel discovery', () => {
  it('maps every channel the account can post to', async () => {
    g.channelsList.mockResolvedValue({
      data: {
        items: [
          {
            id: 'ch-1',
            snippet: {
              title: 'Main',
              customUrl: '@main',
              thumbnails: { default: { url: 'https://thumb' } },
            },
            statistics: { subscriberCount: '42' },
          },
        ],
      },
    });

    await expect(provider.pages('at')).resolves.toEqual([
      {
        id: 'ch-1',
        name: 'Main',
        picture: { data: { url: 'https://thumb' } },
        username: '@main',
        subscriberCount: '42',
      },
    ]);
  });

  it('falls back for a channel with no snippet or statistics', async () => {
    g.channelsList.mockResolvedValue({ data: { items: [{ id: 'ch-1' }] } });

    await expect(provider.pages('at')).resolves.toEqual([
      {
        id: 'ch-1',
        name: 'Unnamed Channel',
        picture: { data: { url: '' } },
        username: '',
        subscriberCount: '0',
      },
    ]);
  });

  it('returns no channels rather than failing the connect flow', async () => {
    g.channelsList.mockRejectedValue(new Error('quota'));

    await expect(provider.pages('at')).resolves.toEqual([]);
  });

  it('returns an empty list when google reports no items', async () => {
    g.channelsList.mockResolvedValue({ data: {} });

    await expect(provider.pages('at')).resolves.toEqual([]);
  });

  it('reads a single channel for the connected page', async () => {
    g.channelsList.mockResolvedValue({
      data: {
        items: [
          {
            id: 'ch-1',
            snippet: {
              title: 'Main',
              customUrl: '@main',
              thumbnails: { default: { url: 'https://thumb' } },
            },
          },
        ],
      },
    });

    await expect(
      provider.fetchPageInformation('at', { id: 'ch-1' })
    ).resolves.toEqual({
      id: 'ch-1',
      name: 'Main',
      access_token: 'at',
      picture: 'https://thumb',
      username: '@main',
    });
  });

  it('raises when the requested channel is gone', async () => {
    g.channelsList.mockResolvedValue({ data: { items: [] } });

    await expect(
      provider.fetchPageInformation('at', { id: 'ch-1' })
    ).rejects.toThrow(/Channel not found/);
  });

  it('reconnects a channel the account still owns', async () => {
    g.channelsList.mockResolvedValue({
      data: { items: [{ id: 'ch-1', snippet: { title: 'Main' } }] },
    });

    await expect(provider.reConnect('id', 'ch-1', 'at')).resolves.toMatchObject({
      id: 'ch-1',
      name: 'Main',
      accessToken: 'at',
    });
  });

  it('refuses to reconnect a channel the account lost access to', async () => {
    g.channelsList.mockResolvedValue({
      data: { items: [{ id: 'other', snippet: { title: 'Other' } }] },
    });

    await expect(provider.reConnect('id', 'ch-1', 'at')).rejects.toThrow(
      /Channel not found/
    );
  });
});

describe('YoutubeProvider.postPending', () => {
  const sessionOk = () =>
    new Response(null, { status: 200, headers: { location: UPLOAD_URI } });

  it('opens a resumable session and hands the workflow the upload state', async () => {
    stubFetch([
      [MEDIA, () => new Response(null, { headers: { 'content-length': '2048' } })],
      ['googleapis.com/upload', () => sessionOk()],
    ]);

    const [result] = await provider.postPending(
      'id',
      'at',
      [post() as never],
      integration
    );

    expect(result).toMatchObject({
      id: 'post-1',
      status: 'pending',
      pendingData: {
        uploadUri: UPLOAD_URI,
        videoSize: 2048,
        path: MEDIA,
        uploadedBytes: 0,
        thumbnail: '',
      },
    });
  });

  it('sends the title, description, privacy and kids declaration', async () => {
    const http = stubFetch([
      [MEDIA, () => new Response(null, { headers: { 'content-length': '10' } })],
      ['googleapis.com/upload', () => sessionOk()],
    ]);

    await provider.postPending(
      'id',
      'at',
      [
        post({
          settings: {
            title: 'A title',
            type: 'unlisted',
            selfDeclaredMadeForKids: 'yes',
            tags: [{ label: 'one' }, { label: 'two' }],
          },
        }) as never,
      ],
      integration
    );

    expect(http.body('googleapis.com/upload')).toEqual({
      snippet: {
        title: 'A title',
        description: 'the description',
        tags: ['one', 'two'],
      },
      status: { privacyStatus: 'unlisted', selfDeclaredMadeForKids: true },
    });
  });

  it('omits tags entirely when none were chosen', async () => {
    const http = stubFetch([
      [MEDIA, () => new Response(null, { headers: { 'content-length': '10' } })],
      ['googleapis.com/upload', () => sessionOk()],
    ]);

    await provider.postPending('id', 'at', [post() as never], integration);

    expect(http.body('googleapis.com/upload').snippet).not.toHaveProperty('tags');
    expect(http.body('googleapis.com/upload').status).toEqual({
      privacyStatus: 'public',
      selfDeclaredMadeForKids: false,
    });
  });

  it('carries a chosen thumbnail into the pending state', async () => {
    stubFetch([
      [MEDIA, () => new Response(null, { headers: { 'content-length': '10' } })],
      ['googleapis.com/upload', () => sessionOk()],
    ]);

    const [result] = await provider.postPending(
      'id',
      'at',
      [
        post({
          settings: {
            title: 't',
            type: 'public',
            thumbnail: { path: 'https://thumb.test/a.jpg' },
          },
        }) as never,
      ],
      integration
    );

    expect((result as any).pendingData.thumbnail).toBe('https://thumb.test/a.jpg');
  });

  it('refuses when the media store will not report a size', async () => {
    stubFetch([[MEDIA, () => new Response(null, { headers: {} })]]);

    await expect(
      provider.postPending('id', 'at', [post() as never], integration)
    ).rejects.toThrow(/Could not determine the video size/);
  });

  it('refuses when google does not hand back a session uri', async () => {
    stubFetch([
      [MEDIA, () => new Response(null, { headers: { 'content-length': '10' } })],
      ['googleapis.com/upload', () => new Response(null, { status: 200 })],
    ]);

    await expect(
      provider.postPending('id', 'at', [post() as never], integration)
    ).rejects.toThrow(/Could not start the video upload/);
  });
});

describe('YoutubeProvider.checkPostStatus', () => {
  it('completes as soon as the session reports the created video', async () => {
    stubFetch([[UPLOAD_URI, () => Response.json({ id: 'vid-1' })]]);

    await expect(
      provider.checkPostStatus('at', pending() as never, integration)
    ).resolves.toEqual({
      status: 'completed',
      postId: 'vid-1',
      releaseURL: 'https://www.youtube.com/watch?v=vid-1',
    });
  });

  it('stays ready for the thumbnail step when one was chosen', async () => {
    stubFetch([[UPLOAD_URI, () => Response.json({ id: 'vid-1' })]]);

    await expect(
      provider.checkPostStatus(
        'at',
        pending({ thumbnail: 'https://thumb' }) as never,
        integration
      )
    ).resolves.toMatchObject({
      status: 'ready',
      pendingData: { videoId: 'vid-1' },
    });
  });

  it('reports the resume offset the session committed', async () => {
    stubFetch([[UPLOAD_URI, () => resumeAt(499)]]);

    await expect(
      provider.checkPostStatus('at', pending() as never, integration)
    ).resolves.toMatchObject({
      status: 'ready',
      pendingData: { uploadedBytes: 500 },
    });
  });

  it('resumes from zero when the session committed nothing yet', async () => {
    stubFetch([[UPLOAD_URI, () => resumeAt(null)]]);

    await expect(
      provider.checkPostStatus('at', pending() as never, integration)
    ).resolves.toMatchObject({ pendingData: { uploadedBytes: 0 } });
  });

  it.each([429, 500, 503])(
    'keeps the post pending through a transient %s',
    async (status) => {
      stubFetch([[UPLOAD_URI, () => new Response('busy', { status })]]);

      await expect(
        provider.checkPostStatus('at', pending() as never, integration)
      ).resolves.toMatchObject({ status: 'pending' });
    }
  );

  it('asks for a reconnect on a 401 from the session', async () => {
    stubFetch([[UPLOAD_URI, () => new Response('nope', { status: 401 })]]);

    await expect(
      provider.checkPostStatus('at', pending() as never, integration)
    ).rejects.toBeInstanceOf(RefreshToken);
  });

  it.each([404, 410])('fails a session that expired with %s', async (status) => {
    stubFetch([[UPLOAD_URI, () => new Response('gone', { status })]]);

    await expect(
      provider.checkPostStatus('at', pending() as never, integration)
    ).rejects.toThrow(/upload session expired/);
  });

  it('surfaces a classified google error from the session', async () => {
    stubFetch([
      [UPLOAD_URI, () => new Response('uploadLimitExceeded', { status: 400 })],
    ]);

    await expect(
      provider.checkPostStatus('at', pending() as never, integration)
    ).rejects.toThrow(/daily upload limit/);
  });
});

describe('YoutubeProvider.finalizePost', () => {
  const chunkRoutes = (
    upload: (call: { init: RequestInit }) => unknown
  ): Parameters<typeof stubFetch>[0] => [
    [MEDIA, () => new Response('x'.repeat(1000), { status: 206 })],
    [
      UPLOAD_URI,
      (call) => (isProbe(call.init) ? resumeAt(null) : upload(call)),
    ],
  ];

  it('streams the remaining bytes and completes on the final chunk', async () => {
    const http = stubFetch(chunkRoutes(() => Response.json({ id: 'vid-1' })));

    await expect(
      provider.finalizePost('at', pending() as never, integration)
    ).resolves.toEqual({
      status: 'completed',
      postId: 'vid-1',
      releaseURL: 'https://www.youtube.com/watch?v=vid-1',
    });

    const chunk = http.calls.find(
      (c) => c.url === UPLOAD_URI && !isProbe(c.init)
    )!;
    expect((chunk.init.headers as any)['Content-Range']).toBe('bytes 0-999/1000');
  });

  it('skips the upload entirely when the video already exists', async () => {
    const http = stubFetch([[UPLOAD_URI, () => Response.json({ id: 'vid-1' })]]);

    await expect(
      provider.finalizePost(
        'at',
        pending({ videoId: 'vid-1' }) as never,
        integration
      )
    ).resolves.toMatchObject({ status: 'completed', postId: 'vid-1' });
    expect(http.calls).toHaveLength(0);
  });

  it('completes without uploading when the probe finds the video', async () => {
    stubFetch([[UPLOAD_URI, () => Response.json({ id: 'vid-9' })]]);

    await expect(
      provider.finalizePost('at', pending() as never, integration)
    ).resolves.toMatchObject({ status: 'completed', postId: 'vid-9' });
  });

  it('continues from the offset a 308 reports mid-upload', async () => {
    let call = 0;
    const http = stubFetch(
      chunkRoutes(() => (call++ === 0 ? resumeAt(499) : Response.json({ id: 'v' })))
    );

    await expect(
      provider.finalizePost('at', pending() as never, integration)
    ).resolves.toMatchObject({ status: 'completed' });

    const ranges = http.calls
      .filter((c) => c.url === UPLOAD_URI && !isProbe(c.init))
      .map((c) => (c.init.headers as any)['Content-Range']);
    expect(ranges).toEqual(['bytes 0-999/1000', 'bytes 500-999/1000']);
  });

  it('hands back to the workflow when a 308 reports no committed range', async () => {
    stubFetch(chunkRoutes(() => resumeAt(null)));

    await expect(
      provider.finalizePost('at', pending() as never, integration)
    ).resolves.toMatchObject({
      status: 'pending',
      pendingData: { uploadedBytes: 0 },
    });
  });

  it.each([429, 500])(
    'throws a plain error on a transient %s so the session can resume',
    async (status) => {
      stubFetch(chunkRoutes(() => new Response('busy', { status })));

      const err = await provider
        .finalizePost('at', pending() as never, integration)
        .catch((e) => e);

      expect(err).toBeInstanceOf(Error);
      expect(err).not.toBeInstanceOf(BadBody);
      expect(err.message).toMatch(/chunk upload failed with/);
    }
  );

  it('asks for a reconnect when the chunk upload is rejected with 401', async () => {
    stubFetch(chunkRoutes(() => new Response('nope', { status: 401 })));

    await expect(
      provider.finalizePost('at', pending() as never, integration)
    ).rejects.toBeInstanceOf(RefreshToken);
  });

  it('fails the post on an unrecoverable chunk rejection', async () => {
    stubFetch(chunkRoutes(() => new Response('invalidTitle', { status: 400 })));

    await expect(
      provider.finalizePost('at', pending() as never, integration)
    ).rejects.toThrow(/Title is too long/);
  });

  it('refuses a media store that ignores the requested byte range', async () => {
    stubFetch([
      [MEDIA, () => new Response('everything', { status: 200 })],
      [UPLOAD_URI, () => resumeAt(null)],
    ]);

    await expect(
      provider.finalizePost('at', pending() as never, integration)
    ).rejects.toThrow(/did not return the requested byte range/);
  });

  it('sets the thumbnail once the video exists', async () => {
    stubFetch([[UPLOAD_URI, () => Response.json({ id: 'vid-1' })]]);
    const axios = vi
      .spyOn<any, any>(provider as any, 'getSsrfSafeAxios')
      .mockReturnValue(async () => ({ data: 'stream' }));

    await expect(
      provider.finalizePost(
        'at',
        pending({ videoId: 'vid-1', thumbnail: 'https://thumb/a.jpg' }) as never,
        integration
      )
    ).resolves.toMatchObject({ status: 'completed' });

    expect(g.thumbnailsSet).toHaveBeenCalledWith({
      videoId: 'vid-1',
      media: { body: 'stream' },
    });
    axios.mockRestore();
  });

  it('gives up the batch when the upload budget is spent', async () => {
    stubFetch(chunkRoutes(() => resumeAt(499)));
    const start = Date.now();
    let calls = 0;
    // the second loop pass is past the batch budget, so the provider should
    // hand the remaining bytes back rather than run past the activity timeout
    const now = vi
      .spyOn(Date, 'now')
      .mockImplementation(() => (calls++ < 2 ? start : start + 5 * 60 * 1000));

    await expect(
      provider.finalizePost('at', pending() as never, integration)
    ).resolves.toMatchObject({
      status: 'pending',
      pendingData: { uploadedBytes: 500 },
    });

    now.mockRestore();
  });
});

describe('YoutubeProvider.post', () => {
  it('drives the resumable upload to completion for old workflows', async () => {
    stubFetch([
      [MEDIA, () => new Response(null, { headers: { 'content-length': '10' } })],
      [
        'googleapis.com/upload',
        () => new Response(null, { status: 200, headers: { location: UPLOAD_URI } }),
      ],
      [UPLOAD_URI, () => Response.json({ id: 'vid-1' })],
    ]);

    await expect(
      provider.post('id', 'at', [post() as never], integration)
    ).resolves.toEqual([
      {
        id: 'post-1',
        releaseURL: 'https://www.youtube.com/watch?v=vid-1',
        postId: 'vid-1',
        status: 'success',
      },
    ]);
  });

  it('refuses to run past the old activity timeout', async () => {
    stubFetch([
      [
        MEDIA,
        ({ init }) =>
          init.method === 'HEAD'
            ? new Response(null, { headers: { 'content-length': '10' } })
            : new Response('x'.repeat(10), { status: 206 }),
      ],
      [
        'googleapis.com/upload',
        () => new Response(null, { status: 200, headers: { location: UPLOAD_URI } }),
      ],
      [UPLOAD_URI, () => resumeAt(null)],
    ]);
    const start = Date.now();
    let calls = 0;
    const now = vi
      .spyOn(Date, 'now')
      .mockImplementation(() => (calls++ < 2 ? start : start + 20 * 60 * 1000));

    await expect(
      provider.post('id', 'at', [post() as never], integration)
    ).rejects.toThrow(/took too long/);

    now.mockRestore();
  });
});

describe('YoutubeProvider analytics', () => {
  it('turns the channel report into the dashboard series', async () => {
    g.reportsQuery.mockResolvedValue({
      data: {
        columnHeaders: [
          { name: 'day' },
          { name: 'views' },
          { name: 'estimatedMinutesWatched' },
          { name: 'averageViewDuration' },
          { name: 'averageViewPercentage' },
          { name: 'subscribersGained' },
          { name: 'likes' },
          { name: 'subscribersLost' },
        ],
        rows: [['2024-05-01', 10, 20, 30, 40, 5, 6, 1]],
      },
    });

    const result = await provider.analytics('id', 'at', 7);

    expect(result.map((r) => r.label)).toEqual([
      'Estimated Minutes Watched',
      'Average View Duration',
      'Average View Percentage',
      'Subscribers Gained',
      'Subscribers Lost',
      'Likes',
    ]);
    expect(result[0].data).toEqual([{ total: 20, date: '2024-05-01' }]);
    expect(result[1]).toMatchObject({ average: true });
  });

  it('returns nothing rather than breaking the panel', async () => {
    g.reportsQuery.mockRejectedValue(new Error('no analytics scope'));

    await expect(provider.analytics('id', 'at', 7)).resolves.toEqual([]);
  });

  it('reports the per-video counters', async () => {
    g.videosList.mockResolvedValue({
      data: {
        items: [
          {
            statistics: {
              viewCount: '100',
              likeCount: '10',
              commentCount: '2',
              favoriteCount: '0',
            },
          },
        ],
      },
    });

    const result = await provider.postAnalytics('id', 'at', 'vid-1', 7);

    expect(result.map((r) => r.label)).toEqual([
      'Views',
      'Likes',
      'Comments',
      'Favorites',
    ]);
    expect(result[0].data[0].total).toBe('100');
  });

  it('returns nothing when the video has no statistics', async () => {
    g.videosList.mockResolvedValue({ data: { items: [{}] } });

    await expect(provider.postAnalytics('id', 'at', 'vid-1', 7)).resolves.toEqual(
      []
    );
  });

  it('returns nothing when the video is gone', async () => {
    g.videosList.mockResolvedValue({ data: { items: [] } });

    await expect(provider.postAnalytics('id', 'at', 'vid-1', 7)).resolves.toEqual(
      []
    );
  });

  it('swallows a failed per-video lookup', async () => {
    g.videosList.mockRejectedValue(new Error('quota'));

    await expect(provider.postAnalytics('id', 'at', 'vid-1', 7)).resolves.toEqual(
      []
    );
  });
});
