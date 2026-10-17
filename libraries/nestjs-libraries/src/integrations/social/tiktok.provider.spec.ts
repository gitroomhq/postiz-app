vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody, NotEnoughScopes, RefreshToken } from '../social.abstract';
import { TiktokProvider } from './tiktok.provider';

const provider = new TiktokProvider();
const integration = { internalId: 'tt-1', profile: 'me' } as never;

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello from the test suite',
  media: [{ path: '/clip.mp4' }],
  settings: {},
  ...over,
});

const initResponse = (over: Record<string, unknown> = {}) => ({
  data: { publish_id: 'pub-1', upload_url: 'https://upload.tiktok.test/1', ...over },
});

/** Skip the byte streaming, which is covered by its own size/chunk assertions. */
const stubUpload = () =>
  vi.spyOn<any, any>(provider as any, 'uploadTikTokVideoBytes').mockResolvedValue(undefined);
const stubSize = (size = 1024) =>
  vi.spyOn<any, any>(provider as any, 'mediaSize').mockResolvedValue(size);

describe('TiktokProvider.checkValidity', () => {
  it('requires at least one media', async () => {
    await expect(provider.checkValidity([[]])).resolves.toBe('No video / images selected');
  });

  it('refuses mixing a video into a multi-item post', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }, { path: '/clip.mp4' }]])
    ).resolves.toBe('Only pictures are supported when selecting multiple items');
  });

  it('accepts a single video', async () => {
    await expect(provider.checkValidity([[{ path: '/clip.mp4' }]])).resolves.toBe(true);
  });

  it('accepts a photo carousel', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }, { path: '/b.jpg' }]])
    ).resolves.toBe(true);
  });
});

describe('TiktokProvider.handleErrors', () => {
  it('asks for a reconnect on an invalid token', () => {
    expect(provider.handleErrors('access_token_invalid')).toEqual({
      type: 'refresh-token',
      value: 'Access token invalid, please re-authenticate your TikTok account',
    });
  });

  it('disconnects the channel on the daily user cap', () => {
    // No number of token refreshes resets a daily quota, so this has to take
    // the channel out of rotation rather than retry forever.
    expect(provider.handleErrors('reached_active_user_cap')).toEqual({
      type: 'disconnect',
      value: 'TikTok daily user limit reached, please re-connect your account',
    });
  });

  it.each([
    ['scope_not_authorized', 'Missing required permissions, please re-authenticate with all scopes'],
    ['rate_limit_exceeded', 'TikTok API rate limit exceeded, please try again later'],
    ['file_format_check_failed', 'File format is invalid, please check video specifications'],
    ['duration_check_failed', 'Video duration is invalid, please check video specifications'],
    ['frame_rate_check_failed', 'Video frame rate is invalid, please check video specifications'],
  ])('reports %j as a terminal bad body', (body, value) => {
    expect(provider.handleErrors(body)).toEqual({ type: 'bad-body', value });
  });

  it('leaves an unrecognised body unclassified', () => {
    expect(provider.handleErrors('{"error":"brand new"}')).toBeUndefined();
  });
});

describe('TiktokProvider upload initialisation', () => {
  it('publishes a video directly unless UPLOAD was chosen', async () => {
    const size = stubSize();
    const upload = stubUpload();
    const fetch = stubFetch([['/publish/', () => initResponse()]]);

    await provider.postPending('tt-1', 'token', [post()] as never, integration);

    // A missing value silently landing in the inbox is a post the user thinks
    // they published and never did.
    expect(fetch.urls()[0]).toContain('/publish/video/init/');

    size.mockRestore();
    upload.mockRestore();
  });

  it('routes an explicit UPLOAD to the inbox endpoint', async () => {
    const size = stubSize();
    const upload = stubUpload();
    const fetch = stubFetch([['/publish/', () => initResponse()]]);

    await provider.postPending(
      'tt-1',
      'token',
      [post({ settings: { content_posting_method: 'UPLOAD' } })] as never,
      integration
    );

    expect(fetch.urls()[0]).toContain('/publish/inbox/video/init/');

    size.mockRestore();
    upload.mockRestore();
  });

  it('uses the content endpoint for photos either way', async () => {
    const fetch = stubFetch([['/publish/', () => initResponse({ upload_url: undefined })]]);

    await provider.postPending(
      'tt-1',
      'token',
      [post({ media: [{ path: '/a.jpg' }] })] as never,
      integration
    );

    expect(fetch.urls()[0]).toContain('/publish/content/init/');
  });

  it('sends the whole video as one chunk when it fits', async () => {
    const size = stubSize(10 * 1024 * 1024);
    const upload = stubUpload();
    const fetch = stubFetch([['/publish/', () => initResponse()]]);

    await provider.postPending('tt-1', 'token', [post()] as never, integration);

    expect(fetch.body('/publish/').source_info).toEqual({
      source: 'FILE_UPLOAD',
      video_size: 10 * 1024 * 1024,
      chunk_size: 10 * 1024 * 1024,
      total_chunk_count: 1,
    });

    size.mockRestore();
    upload.mockRestore();
  });

  it('splits a video past the single-chunk limit', async () => {
    const size = stubSize(100 * 1024 * 1024);
    const upload = stubUpload();
    const fetch = stubFetch([['/publish/', () => initResponse()]]);

    await provider.postPending('tt-1', 'token', [post()] as never, integration);

    expect(fetch.body('/publish/').source_info).toMatchObject({
      chunk_size: 10 * 1024 * 1024,
      total_chunk_count: 10,
    });

    size.mockRestore();
    upload.mockRestore();
  });

  it('pulls photos from their urls with the first as the cover', async () => {
    const fetch = stubFetch([['/publish/', () => initResponse({ upload_url: undefined })]]);

    await provider.postPending(
      'tt-1',
      'token',
      [post({ media: [{ path: '/a.jpg' }, { path: '/b.jpg' }] })] as never,
      integration
    );

    expect(fetch.body('/publish/')).toMatchObject({
      post_mode: 'DIRECT_POST',
      media_type: 'PHOTO',
      source_info: {
        source: 'PULL_FROM_URL',
        photo_cover_index: 0,
        photo_images: ['/a.jpg', '/b.jpg'],
      },
    });
  });

  it('carries the message as the video title and the settings as flags', async () => {
    const size = stubSize();
    const upload = stubUpload();
    const fetch = stubFetch([['/publish/', () => initResponse()]]);

    await provider.postPending(
      'tt-1',
      'token',
      [post({ settings: { comment: true, duet: false, stitch: true } })] as never,
      integration
    );

    expect(fetch.body('/publish/').post_info).toMatchObject({
      title: 'hello from the test suite',
      privacy_level: 'PUBLIC_TO_EVERYONE',
      disable_comment: false,
      disable_duet: true,
      disable_stitch: false,
    });

    size.mockRestore();
    upload.mockRestore();
  });

  it('sends only the caption for an inbox upload, with no publish settings', async () => {
    const size = stubSize();
    const upload = stubUpload();
    const fetch = stubFetch([['/publish/', () => initResponse()]]);

    await provider.postPending(
      'tt-1',
      'token',
      [post({ settings: { content_posting_method: 'UPLOAD', comment: true } })] as never,
      integration
    );

    expect(fetch.body('/publish/').post_info).toEqual({ title: 'hello from the test suite' });

    size.mockRestore();
    upload.mockRestore();
  });

  it('truncates a photo title to what TikTok accepts', async () => {
    const fetch = stubFetch([['/publish/', () => initResponse({ upload_url: undefined })]]);

    await provider.postPending(
      'tt-1',
      'token',
      [post({ media: [{ path: '/a.jpg' }], settings: { title: 'x'.repeat(200) } })] as never,
      integration
    );

    expect(fetch.body('/publish/').post_info.title).toHaveLength(90);
  });
});

describe('TiktokProvider upload failures', () => {
  it('fails the post on an explicit rejection from TikTok', async () => {
    const size = stubSize();
    const upload = vi
      .spyOn<any, any>(provider as any, 'uploadTikTokVideoBytes')
      .mockRejectedValue(new BadBody('tiktok', '{}', '{}', 'file rejected'));
    stubFetch([['/publish/', () => initResponse()]]);

    await expect(
      provider.postPending('tt-1', 'token', [post()] as never, integration)
    ).rejects.toBeInstanceOf(BadBody);

    size.mockRestore();
    upload.mockRestore();
  });

  it('returns pending on an ambiguous network failure mid-upload', async () => {
    const size = stubSize();
    const upload = vi
      .spyOn<any, any>(provider as any, 'uploadTikTokVideoBytes')
      .mockRejectedValue(new Error('ECONNRESET'));
    stubFetch([['/publish/', () => initResponse()]]);

    // TikTok may have received every byte and still publish; retrying the
    // whole publish is how the same video gets posted twice.
    await expect(
      provider.postPending('tt-1', 'token', [post()] as never, integration)
    ).resolves.toMatchObject([{ status: 'pending', pendingData: { publishId: 'pub-1' } }]);

    size.mockRestore();
    upload.mockRestore();
  });
});

describe('TiktokProvider.checkPostStatus', () => {
  const pendingData = { publishId: 'pub-1' };

  it('stays pending while the upload is processing', async () => {
    stubFetch([['/status/fetch/', () => ({ data: { status: 'PROCESSING_UPLOAD' } })]]);

    await expect(
      provider.checkPostStatus('token', pendingData, integration)
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('completes with the video url once TikTok reports a public id', async () => {
    stubFetch([
      [
        '/status/fetch/',
        () => ({ data: { status: 'PUBLISH_COMPLETE', publicaly_available_post_id: [1234] } }),
      ],
    ]);

    // TikTok answers with a number; releaseId is a string in the database.
    await expect(provider.checkPostStatus('token', pendingData, integration)).resolves.toEqual({
      status: 'completed',
      postId: '1234',
      releaseURL: 'https://www.tiktok.com/@me/video/1234',
    });
  });

  it('falls back to the profile url for an empty public id array', async () => {
    stubFetch([
      [
        '/status/fetch/',
        () => ({ data: { status: 'PUBLISH_COMPLETE', publicaly_available_post_id: [] } }),
      ],
    ]);

    // An empty array is truthy - branching on it directly published a url
    // ending in "undefined".
    await expect(provider.checkPostStatus('token', pendingData, integration)).resolves.toEqual({
      status: 'completed',
      postId: 'pub-1',
      releaseURL: 'https://www.tiktok.com/@me',
    });
  });

  it('completes an inbox upload with a link to the messages screen', async () => {
    stubFetch([['/status/fetch/', () => ({ data: { status: 'SEND_TO_USER_INBOX' } })]]);

    await expect(provider.checkPostStatus('token', pendingData, integration)).resolves.toEqual({
      status: 'completed',
      releaseURL: 'https://www.tiktok.com/messages?lang=en',
      postId: 'missing',
    });
  });

  it('reports a failed publish with the reason TikTok gave', async () => {
    stubFetch([
      [
        '/status/fetch/',
        () => ({ data: { status: 'FAILED' }, error: 'duration_check_failed' }),
      ],
    ]);

    const error = await provider
      .checkPostStatus('token', pendingData, integration)
      .catch((e) => e);

    expect(error).toBeInstanceOf(BadBody);
    expect(error.message).toBe('Video duration is invalid, please check video specifications');
  });

  it('keeps polling through a transient status failure', async () => {
    stubFetch([['/status/fetch/', () => Response.json({ message: 'gateway' }, { status: 502 })]]);

    await expect(
      provider.checkPostStatus('token', pendingData, integration)
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('surfaces an expired token rather than polling forever', async () => {
    stubFetch([
      [
        '/status/fetch/',
        () => Response.json({ error: { code: 'access_token_invalid' } }, { status: 401 }),
      ],
    ]);

    await expect(provider.checkPostStatus('token', pendingData, integration)).rejects.toBeInstanceOf(
      RefreshToken
    );
  });
});

describe('TiktokProvider.handleErrors full classification', () => {
  it.each([
    ['scope_permission_missed', 'Additional permissions required, please re-authenticate'],
    ['app_version_check_failed', 'In order to use the TikTok upload feature, you have to update your app to the latest version'],
    ['video_pull_failed', 'Failed to pull video from URL, please check the URL'],
    ['photo_pull_failed', 'Failed to pull photo from URL, please check the URL'],
    ['spam_risk_user_banned_from_posting', 'Account banned from posting, please check TikTok account status'],
    ['spam_risk_text', 'TikTok detected potential spam in the post text'],
    ['spam_risk_too_many_posts', 'TikTok says your daily post limit reached, please try again tomorrow'],
    [
      'spam_risk_too_many_pending_share',
      'TikTok limits pending posts to 5 within any 24-hour period. Please check your TikTok inbox in the TikTok mobile app and try again after 24 hours.',
    ],
    ['spam_risk', 'TikTok detected potential spam'],
    ['unaudited_client_can_only_post_to_private_accounts', 'App not approved for public posting, contact support'],
    ['url_ownership_unverified', 'You have to upload the picture/video to Postiz when sending a URL'],
    ['privacy_level_option_mismatch', 'Privacy level mismatch, please check privacy settings'],
    ['invalid_file_upload', 'Invalid file format or specifications not met'],
    ['invalid_params', 'Invalid request parameters, please check content format'],
    ['internal', 'There is a problem with TikTok servers, please try again later'],
    ['picture_size_check_failed', 'Video must be at least 720p, Picture must no exceed 1080p'],
    ['TikTok API error', 'TikTok API error, please try again'],
  ])('maps %j to its own message', (body, value) => {
    expect(provider.handleErrors(body)?.value).toBe(value);
  });

  it('prefers the ban message over the generic spam one', () => {
    // Both substrings match; ordering is what makes the message actionable.
    expect(provider.handleErrors('spam_risk_user_banned_from_posting')?.value).toContain(
      'banned from posting'
    );
  });

  it('prefers the pending-share limit over the generic spam one', () => {
    expect(provider.handleErrors('spam_risk_too_many_pending_share')?.value).toContain(
      'pending posts to 5'
    );
  });
});

describe('TiktokProvider byte upload', () => {
  const uploadUrl = 'https://upload.tiktok.test/1';

  const rangeResponse = (body = 'x') => new Response(body, { status: 206 });

  it('sends one PUT with the whole file when it fits in a single chunk', async () => {
    const fetch = stubFetch([
      ['media.test', () => rangeResponse()],
      ['upload.tiktok.test', () => new Response('', { status: 201 })],
    ]);

    await (provider as any).uploadTikTokVideoBytes(
      uploadUrl,
      'https://media.test/clip.mp4',
      1000,
      'video/mp4'
    );

    expect(fetch.countTo('upload.tiktok.test')).toBe(1);
    expect(fetch.calls[1].init.headers).toMatchObject({
      'Content-Length': '1000',
      'Content-Range': 'bytes 0-999/1000',
      'Content-Type': 'video/mp4',
    });
  });

  it('sends a file under the single-chunk limit in one piece', async () => {
    const size = 25 * 1024 * 1024;
    const fetch = stubFetch([
      ['media.test', () => rangeResponse()],
      ['upload.tiktok.test', () => new Response('', { status: 200 })],
    ]);

    await (provider as any).uploadTikTokVideoBytes(
      uploadUrl,
      'https://media.test/clip.mp4',
      size,
      'video/mp4'
    );

    expect(fetch.countTo('upload.tiktok.test')).toBe(1);
  });

  it('asks the media store for the exact byte range of each chunk', async () => {
    const chunk = 10 * 1024 * 1024;
    const size = 100 * 1024 * 1024 + 7;
    const fetch = stubFetch([
      ['media.test', () => rangeResponse()],
      ['upload.tiktok.test', () => new Response('', { status: 200 })],
    ]);

    await (provider as any).uploadTikTokVideoBytes(
      uploadUrl,
      'https://media.test/clip.mp4',
      size,
      'video/mp4'
    );

    const ranges = fetch.calls
      .filter((c) => c.url.includes('media.test'))
      .map((c) => (c.init.headers as Record<string, string>).Range);

    // The last chunk carries the remainder rather than stopping short, which
    // would upload a truncated video TikTok then rejects.
    expect(ranges).toHaveLength(10);
    expect(ranges[0]).toBe(`bytes=0-${chunk - 1}`);
    expect(ranges.at(-1)).toBe(`bytes=${9 * chunk}-${size - 1}`);
  });

  it('refuses a media store that ignores the range request', async () => {
    stubFetch([
      // 200 with the whole file at a non-zero offset would corrupt the upload.
      ['media.test', () => new Response('x', { status: 200 })],
      ['upload.tiktok.test', () => new Response('', { status: 201 })],
    ]);

    await expect(
      (provider as any).uploadTikTokVideoBytes(
        uploadUrl,
        'https://media.test/clip.mp4',
        1000,
        'video/mp4'
      )
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('accepts a 206 from the upload endpoint, which a chunked PUT answers with', async () => {
    stubFetch([
      ['media.test', () => rangeResponse()],
      ['upload.tiktok.test', () => new Response('', { status: 206 })],
    ]);

    await expect(
      (provider as any).uploadTikTokVideoBytes(
        uploadUrl,
        'https://media.test/clip.mp4',
        1000,
        'video/mp4'
      )
    ).resolves.toBeUndefined();
  });

  it('classifies the upload rejection body rather than reporting it generically', async () => {
    stubFetch([
      ['media.test', () => rangeResponse()],
      ['upload.tiktok.test', () => new Response('file_format_check_failed', { status: 400 })],
    ]);

    const error = await (provider as any)
      .uploadTikTokVideoBytes(uploadUrl, 'https://media.test/clip.mp4', 1000, 'video/mp4')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadBody);
    expect(error.message).toBe('File format is invalid, please check video specifications');
  });

  it('falls back to a generic message for an unclassifiable rejection', async () => {
    stubFetch([
      ['media.test', () => rangeResponse()],
      ['upload.tiktok.test', () => new Response('who knows', { status: 500 })],
    ]);

    const error = await (provider as any)
      .uploadTikTokVideoBytes(uploadUrl, 'https://media.test/clip.mp4', 1000, 'video/mp4')
      .catch((e: unknown) => e);

    expect(error.message).toBe('Failed to upload the video to TikTok');
  });
});

describe('TiktokProvider.post blocking behaviour', () => {
  const completed = () => ({
    data: { status: 'PUBLISH_COMPLETE', publicaly_available_post_id: [42] },
  });

  it('returns as soon as the status check completes', async () => {
    const size = stubSize();
    const upload = stubUpload();
    const fetch = stubFetch([
      ['/publish/video/init/', () => initResponse()],
      ['/status/fetch/', () => completed()],
    ]);

    await expect(
      provider.post('tt-1', 'token', [post()] as never, integration)
    ).resolves.toEqual([
      {
        id: 'post-1',
        postId: '42',
        releaseURL: 'https://www.tiktok.com/@me/video/42',
        status: 'success',
      },
    ]);
    expect(fetch.countTo('/status/fetch/')).toBe(1);

    size.mockRestore();
    upload.mockRestore();
  });

  it('gives up as a terminal failure once the check budget is exhausted', async () => {
    const size = stubSize();
    const upload = stubUpload();
    const fetch = stubFetch([
      ['/publish/video/init/', () => initResponse()],
      ['/status/fetch/', () => ({ data: { status: 'PROCESSING_UPLOAD' } })],
    ]);

    await expect(
      provider.post('tt-1', 'token', [post()] as never, integration)
    ).rejects.toBeInstanceOf(BadBody);
    expect(fetch.countTo('/status/fetch/')).toBe(27);

    size.mockRestore();
    upload.mockRestore();
  });

  it('stops before the activity timeout rather than letting it be retried', async () => {
    const size = stubSize();
    const upload = stubUpload();
    const fetch = stubFetch([
      ['/publish/video/init/', () => initResponse()],
      ['/status/fetch/', () => ({ data: { status: 'PROCESSING_UPLOAD' } })],
    ]);

    const realNow = Date.now();
    let calls = 0;
    const now = vi.spyOn(Date, 'now').mockImplementation(() => realNow + calls++ * 5 * 60 * 1000);

    // A timed-out activity is retried and publishes the video again; failing
    // here is non-retryable and safe.
    await expect(
      provider.post('tt-1', 'token', [post()] as never, integration)
    ).rejects.toBeInstanceOf(BadBody);
    expect(fetch.countTo('/status/fetch/')).toBeLessThan(27);

    now.mockRestore();
    size.mockRestore();
    upload.mockRestore();
  });
});

describe('TiktokProvider.refreshToken', () => {
  it('exchanges the refresh token and reads the profile back', async () => {
    vi.stubEnv('TIKTOK_CLIENT_ID', 'client');
    vi.stubEnv('TIKTOK_CLIENT_SECRET', 'secret');
    const fetch = stubFetch([
      ['/oauth/token/', () => ({ access_token: 'fresh', refresh_token: 'next' })],
      [
        '/user/info/',
        () => ({
          data: {
            user: {
              open_id: 'aa-bb-cc',
              display_name: 'Me',
              username: 'me',
              avatar_url: 'https://pic.test',
            },
          },
        }),
      ],
    ]);

    await expect(provider.refreshToken('old')).resolves.toMatchObject({
      // The dashes are stripped so the id matches what authenticate stored.
      id: 'aabbcc',
      name: 'Me',
      accessToken: 'fresh',
      refreshToken: 'next',
      picture: 'https://pic.test',
      username: 'me',
    });

    expect(String(fetch.calls[0].init.body)).toContain('grant_type=refresh_token');
  });
});

describe('TiktokProvider.authenticate', () => {
  const tokenResponse = (scope: string) => ({
    access_token: 'access',
    refresh_token: 'refresh',
    scope,
  });

  const profile = () => ({
    data: {
      user: {
        open_id: 'aa-bb',
        display_name: 'Me',
        username: 'me',
        avatar_url: 'https://pic.test',
      },
    },
  });

  it('connects the channel when every scope was granted', async () => {
    vi.stubEnv('TIKTOK_CLIENT_ID', 'client');
    vi.stubEnv('FRONTEND_URL', 'https://app.test');
    stubFetch([
      ['/oauth/token/', () => tokenResponse(provider.scopes.join(','))],
      ['/user/info/', profile],
    ]);

    await expect(
      provider.authenticate({ code: 'code', codeVerifier: 'verifier' })
    ).resolves.toMatchObject({ id: 'aabb', accessToken: 'access', refreshToken: 'refresh' });
  });

  it('refuses a connect that came back missing a scope', async () => {
    vi.stubEnv('TIKTOK_CLIENT_ID', 'client');
    vi.stubEnv('FRONTEND_URL', 'https://app.test');
    stubFetch([
      ['/oauth/token/', () => tokenResponse('user.info.basic')],
      ['/user/info/', profile],
    ]);

    // Without video.publish the channel connects and then fails on every post.
    await expect(
      provider.authenticate({ code: 'code', codeVerifier: 'verifier' })
    ).rejects.toBeInstanceOf(NotEnoughScopes);
  });

  it('routes a plain-http development frontend through redirectmeto', async () => {
    vi.stubEnv('TIKTOK_CLIENT_ID', 'client');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:4200');
    const fetch = stubFetch([
      ['/oauth/token/', () => tokenResponse(provider.scopes.join(','))],
      ['/user/info/', profile],
    ]);

    await provider.authenticate({ code: 'code', codeVerifier: 'verifier' });

    // TikTok rejects a non-https redirect_uri, which makes local development
    // impossible without the proxy.
    expect(decodeURIComponent(String(fetch.calls[0].init.body))).toContain(
      'https://redirectmeto.com/http://localhost:4200/integrations/social/tiktok'
    );
  });
});

describe('TiktokProvider.generateAuthUrl', () => {
  it('asks for every scope the provider declares', async () => {
    vi.stubEnv('TIKTOK_CLIENT_ID', 'client');
    vi.stubEnv('FRONTEND_URL', 'https://app.test');

    const { url, state, codeVerifier } = await provider.generateAuthUrl();

    expect(decodeURIComponent(url)).toContain(provider.scopes.join(','));
    expect(url).toContain('client_key=client');
    expect(url).toContain(`state=${state}`);
    // TikTok has no PKCE here, so the verifier is the state.
    expect(codeVerifier).toBe(state);
  });
});

describe('TiktokProvider.maxVideoLength', () => {
  it('reports the duration the creator account allows', async () => {
    stubFetch([['/creator_info/query/', () => ({ data: { max_video_post_duration_sec: 600 } })]]);

    await expect(provider.maxVideoLength('token')).resolves.toEqual({ maxDurationSeconds: 600 });
  });
});

describe('TiktokProvider.analytics', () => {
  const userStats = (over: Record<string, unknown> = {}) => ({
    data: {
      user: {
        follower_count: 10,
        following_count: 5,
        likes_count: 100,
        video_count: 3,
        ...over,
      },
    },
  });

  it('reports the account totals', async () => {
    stubFetch([
      ['/user/info/', userStats],
      ['/video/list/', () => ({ data: { videos: [] } })],
    ]);

    const result = await provider.analytics('tt-1', 'token', 7);

    expect(result.map((r) => r.label)).toEqual(['Followers', 'Following', 'Total Likes', 'Videos']);
    expect(result[0].data[0].total).toBe('10');
  });

  it('aggregates the engagement of the recent videos', async () => {
    stubFetch([
      ['/user/info/', userStats],
      ['/video/list/', () => ({ data: { videos: [{ id: 'v1' }, { id: 'v2' }] } })],
      [
        '/video/query/',
        () => ({
          data: {
            videos: [
              { id: 'v1', view_count: 100, like_count: 10, comment_count: 1, share_count: 2 },
              { id: 'v2', view_count: 50, like_count: 5, comment_count: 0, share_count: 1 },
            ],
          },
        }),
      ],
    ]);

    const result = await provider.analytics('tt-1', 'token', 7);
    const byLabel = Object.fromEntries(result.map((r) => [r.label, r.data[0].total]));

    expect(byLabel).toMatchObject({
      Views: '150',
      'Recent Likes': '15',
      'Recent Comments': '1',
      'Recent Shares': '3',
    });
  });

  it('omits a stat TikTok did not return', async () => {
    stubFetch([
      ['/user/info/', () => ({ data: { user: { follower_count: 10 } } })],
      ['/video/list/', () => ({ data: { videos: [] } })],
    ]);

    await expect(provider.analytics('tt-1', 'token', 7)).resolves.toHaveLength(1);
  });

  it('returns nothing rather than failing the dashboard', async () => {
    stubFetch([
      [
        '/user/info/',
        () => {
          throw new Error('TikTok down');
        },
      ],
    ]);

    await expect(provider.analytics('tt-1', 'token', 7)).resolves.toEqual([]);
  });
});

describe('TiktokProvider.missing', () => {
  it('lists the recent videos with their covers', async () => {
    stubFetch([
      [
        '/video/list/',
        () => ({ data: { videos: [{ id: 1, cover_image_url: 'https://cover.test/1.jpg' }] } }),
      ],
    ]);

    await expect(provider.missing('tt-1', 'token')).resolves.toEqual([
      { id: '1', url: 'https://cover.test/1.jpg' },
    ]);
  });

  it('returns nothing when the account has no videos', async () => {
    stubFetch([['/video/list/', () => ({ data: { videos: [] } })]]);

    await expect(provider.missing('tt-1', 'token')).resolves.toEqual([]);
  });

  it('returns nothing rather than failing when the list cannot be read', async () => {
    stubFetch([['/video/list/', () => Response.json({ message: 'nope' }, { status: 500 })]]);

    await expect(provider.missing('tt-1', 'token')).resolves.toEqual([]);
  });
});

describe('TiktokProvider.postAnalytics', () => {
  const videoMetrics = () => ({
    data: {
      videos: [{ id: '42', view_count: 100, like_count: 10, comment_count: 2, share_count: 1 }],
    },
  });

  it('reports the metrics of a published video', async () => {
    stubFetch([['/video/query/', videoMetrics]]);

    const result = await provider.postAnalytics('tt-1', 'token', '42', 7);

    expect(result.map((r) => r.label)).toEqual(['Views', 'Likes', 'Comments', 'Shares']);
  });

  it('resolves a publish id into the real video id first', async () => {
    const fetch = stubFetch([
      [
        '/publish/status/fetch/',
        () => ({ data: { publicaly_available_post_id: ['42'] } }),
      ],
      ['/video/query/', videoMetrics],
    ]);

    // Posts stored while the id still lagged keep the publish id as releaseId.
    await expect(
      provider.postAnalytics('tt-1', 'token', 'v_pub_url~1234', 7)
    ).resolves.toHaveLength(4);

    expect(JSON.parse(String(fetch.calls[1].init.body)).filters.video_ids).toEqual(['42']);
  });

  it('returns nothing while the publish id has still not resolved', async () => {
    stubFetch([['/publish/status/fetch/', () => ({ data: {} })]]);

    await expect(provider.postAnalytics('tt-1', 'token', 'v_pub_url~1234', 7)).resolves.toEqual([]);
  });

  it('returns nothing when the video is gone', async () => {
    stubFetch([['/video/query/', () => ({ data: { videos: [] } })]]);

    await expect(provider.postAnalytics('tt-1', 'token', '42', 7)).resolves.toEqual([]);
  });

  it('returns nothing rather than failing the dashboard', async () => {
    stubFetch([
      [
        '/video/query/',
        () => {
          throw new Error('TikTok down');
        },
      ],
    ]);

    await expect(provider.postAnalytics('tt-1', 'token', '42', 7)).resolves.toEqual([]);
  });
});
