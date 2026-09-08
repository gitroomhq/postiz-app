vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody, RefreshToken } from '../social.abstract';
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
