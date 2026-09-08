vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody, RefreshToken } from '../social.abstract';
import { TiktokBusinessProvider } from './tiktok.business.provider';

const provider = new TiktokBusinessProvider();
const integration = { internalId: 'biz-1', profile: 'me' } as never;

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  message: 'hello from the test suite',
  media: [{ path: '/clip.mp4' }],
  settings: {},
  ...over,
});

/** The Business API answers HTTP 200 with a code, even for failures. */
const envelope = (data: unknown, code = 0, message = 'OK') => ({ code, message, data });

describe('TiktokBusinessProvider.checkValidity', () => {
  it('requires at least one media', async () => {
    await expect(provider.checkValidity([[]])).resolves.toBe('No video / images selected');
  });

  it('refuses mixing a video into a multi-item post', async () => {
    await expect(
      provider.checkValidity([[{ path: '/a.jpg' }, { path: '/clip.mp4' }]])
    ).resolves.toBe('Only pictures are supported when selecting multiple items');
  });

  it('caps a photo post at 35 pictures', async () => {
    const media = Array.from({ length: 36 }, (_, i) => ({ path: `/a${i}.jpg` }));

    await expect(provider.checkValidity([media])).resolves.toBe(
      'You can select up to 35 pictures'
    );
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

describe('TiktokBusinessProvider.handleErrors', () => {
  it.each([
    ['access_token_invalid'],
    ['Access token is incorrect'],
    ['Access token has expired'],
    ['auth_removed'],
  ])('asks for a reconnect on %j', (body) => {
    expect(provider.handleErrors(body)?.type).toBe('refresh-token');
  });

  it.each([
    ['rate_limit_exceeded', 'TikTok API rate limit exceeded, please try again later'],
    ['file_format_check_failed', 'File format is invalid, please check video specifications'],
    ['duration_check_failed', 'Video duration is invalid, please check video specifications'],
    [
      'spam_risk_too_many_posts',
      'TikTok says your daily post limit reached, please try again tomorrow',
    ],
    ['reached_active_user_cap', 'TikTok daily user limit reached, please try again tomorrow'],
    [
      'url_ownership_unverified',
      'The media domain is not a verified URL property of the TikTok app',
    ],
    ['picture_size_check_failed', 'Video must be at least 360p, Picture must not exceed 1080x1920'],
  ])('reports %j as a terminal bad body', (body, value) => {
    expect(provider.handleErrors(body)).toEqual({ type: 'bad-body', value });
  });

  it('prefers the specific daily-limit message over the generic spam one', () => {
    // Both substrings match; ordering is what makes the message actionable.
    expect(provider.handleErrors('spam_risk_too_many_posts')?.value).toContain(
      'daily post limit'
    );
  });

  it('leaves an unrecognised body unclassified', () => {
    expect(provider.handleErrors('{"error":"brand new"}')).toBeUndefined();
  });
});

describe('TiktokBusinessProvider video publishing', () => {
  it('publishes a video and returns pending for the workflow to poll', async () => {
    const fetch = stubFetch([
      ['/business/video/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    const [response] = await provider.postPending(
      'biz-1',
      'token',
      [post()] as never,
      integration
    );

    expect(response).toMatchObject({
      status: 'pending',
      pendingData: { publishId: 'pub-1' },
    });
    expect(fetch.calls[0].init.headers).toMatchObject({ 'Access-Token': 'token' });
  });

  it('publishes directly unless the settings explicitly ask for a draft', async () => {
    const fetch = stubFetch([
      ['/business/video/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    await provider.postPending('biz-1', 'token', [post()] as never, integration);

    // A missing value silently landing in the inbox is a post the user thinks
    // they published and never did.
    expect(fetch.body('/publish/').post_info.upload_to_draft).toBeUndefined();
    expect(fetch.body('/publish/').post_info.disable_comment).toBe(true);
  });

  it('uploads to the drafts inbox for an explicit UPLOAD', async () => {
    const fetch = stubFetch([
      ['/business/video/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    await provider.postPending(
      'biz-1',
      'token',
      [post({ settings: { content_posting_method: 'UPLOAD' } })] as never,
      integration
    );

    expect(fetch.body('/publish/').post_info.upload_to_draft).toBe(true);
  });

  it('prefers a custom thumbnail over a timestamp offset', async () => {
    const fetch = stubFetch([
      ['/business/video/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    await provider.postPending(
      'biz-1',
      'token',
      [post({ media: [{ path: '/clip.mp4', thumbnail: '/t.jpg', thumbnailTimestamp: 5 }] })] as never,
      integration
    );

    expect(fetch.body('/publish/')).toMatchObject({ custom_thumbnail_url: '/t.jpg' });
    expect(fetch.body('/publish/').thumbnail_offset).toBeUndefined();
  });

  it('defaults a selected track to the volumes the TikTok app uses', async () => {
    const fetch = stubFetch([
      ['/business/video/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    await provider.postPending(
      'biz-1',
      'token',
      [post({ settings: { music: { id: 'track-1' } } })] as never,
      integration
    );

    // The API defaults both to 0, which publishes a silent video.
    expect(fetch.body('/publish/').post_info.music_sound_info).toEqual({
      music_sound_id: 'track-1',
      music_sound_volume: 50,
      video_original_sound_volume: 50,
    });
  });

  it('honours explicitly chosen volumes', async () => {
    const fetch = stubFetch([
      ['/business/video/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    await provider.postPending(
      'biz-1',
      'token',
      [post({ settings: { music: { id: 'track-1', audio_volume: 10, video_volume: 90 } } })] as never,
      integration
    );

    expect(fetch.body('/publish/').post_info.music_sound_info).toMatchObject({
      music_sound_volume: 10,
      video_original_sound_volume: 90,
    });
  });
});

describe('TiktokBusinessProvider photo publishing', () => {
  const photoPost = (over: Record<string, unknown> = {}) =>
    post({ media: [{ path: '/a.jpg' }, { path: '/b.jpg' }], ...over });

  it('publishes every image with the first as the cover', async () => {
    const fetch = stubFetch([
      ['/business/photo/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    await provider.postPending('biz-1', 'token', [photoPost()] as never, integration);

    expect(fetch.body('/publish/')).toMatchObject({
      photo_images: ['/a.jpg', '/b.jpg'],
      photo_cover_index: 0,
    });
  });

  it('defaults a photo post to public', async () => {
    const fetch = stubFetch([
      ['/business/photo/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    await provider.postPending('biz-1', 'token', [photoPost()] as never, integration);

    expect(fetch.body('/publish/').post_info.privacy_level).toBe('PUBLIC_TO_EVERYONE');
  });

  it('truncates the title to what TikTok accepts', async () => {
    const fetch = stubFetch([
      ['/business/photo/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    await provider.postPending(
      'biz-1',
      'token',
      [photoPost({ settings: { title: 'x'.repeat(200) } })] as never,
      integration
    );

    expect(fetch.body('/publish/').post_info.title).toHaveLength(90);
  });

  it('picks a track from the commercial library when random music is on', async () => {
    const pick = vi
      .spyOn<any, any>(provider as any, 'pickRandomMusicId')
      .mockResolvedValue('track-9');
    const fetch = stubFetch([
      ['/business/photo/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    await provider.postPending(
      'biz-1',
      'token',
      [photoPost({ settings: { autoAddMusic: 'yes' } })] as never,
      integration
    );

    expect(fetch.body('/publish/').post_info.music_sound_info).toEqual({
      music_sound_id: 'track-9',
    });
    expect(fetch.body('/publish/').post_info.auto_add_music).toBe(false);

    pick.mockRestore();
  });

  it("falls back to TikTok's own recommendation when no track could be picked", async () => {
    const pick = vi
      .spyOn<any, any>(provider as any, 'pickRandomMusicId')
      .mockResolvedValue(undefined);
    const fetch = stubFetch([
      ['/business/photo/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    await provider.postPending(
      'biz-1',
      'token',
      [photoPost({ settings: { autoAddMusic: 'yes' } })] as never,
      integration
    );

    expect(fetch.body('/publish/').post_info.auto_add_music).toBe(true);

    pick.mockRestore();
  });

  it('lets random music win over a stale explicit selection', async () => {
    const pick = vi
      .spyOn<any, any>(provider as any, 'pickRandomMusicId')
      .mockResolvedValue('track-9');
    const fetch = stubFetch([
      ['/business/photo/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    // The UI hides the selector while random music is on, so the old value is
    // invisible to the user.
    await provider.postPending(
      'biz-1',
      'token',
      [photoPost({ settings: { autoAddMusic: 'yes', music: { id: 'stale' } } })] as never,
      integration
    );

    expect(fetch.body('/publish/').post_info.music_sound_info.music_sound_id).toBe('track-9');

    pick.mockRestore();
  });
});

describe('TiktokBusinessProvider publish failures', () => {
  it('classifies a token failure hidden behind an HTTP 200', async () => {
    stubFetch([
      ['/publish/', () => envelope({}, 40001, 'access_token_invalid')],
    ]);

    // The Business API never uses HTTP status for errors, so this.fetch cannot
    // see them at all.
    await expect(
      provider.postPending('biz-1', 'token', [post()] as never, integration)
    ).rejects.toBeInstanceOf(RefreshToken);
  });

  it('reports any other non-zero code as a terminal failure', async () => {
    stubFetch([['/publish/', () => envelope({}, 40002, 'spam_risk')]]);

    await expect(
      provider.postPending('biz-1', 'token', [post()] as never, integration)
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('treats a success envelope with no share id as a failure', async () => {
    stubFetch([['/publish/', () => envelope({})]]);

    await expect(
      provider.postPending('biz-1', 'token', [post()] as never, integration)
    ).rejects.toBeInstanceOf(BadBody);
  });
});

describe('TiktokBusinessProvider.checkPostStatus', () => {
  const pendingData = { publishId: 'pub-1' };

  it('stays pending while the upload is still processing', async () => {
    stubFetch([['/publish/status/', () => envelope({ status: 'PROCESSING_UPLOAD' })]]);

    await expect(
      provider.checkPostStatus('token', pendingData, integration)
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('completes with the video url once TikTok reports the post ids', async () => {
    stubFetch([
      [
        '/publish/status/',
        () => envelope({ status: 'PUBLISH_COMPLETE', post_ids: ['1234'] }),
      ],
    ]);

    await expect(provider.checkPostStatus('token', pendingData, integration)).resolves.toEqual({
      status: 'completed',
      postId: '1234',
      releaseURL: 'https://www.tiktok.com/@me/video/1234',
    });
  });

  it('falls back to the profile url while the post ids still lag', async () => {
    stubFetch([['/publish/status/', () => envelope({ status: 'PUBLISH_COMPLETE' })]]);

    // post_ids can lag three minutes behind, and never arrive for a private
    // post - failing here would republish something already live.
    await expect(provider.checkPostStatus('token', pendingData, integration)).resolves.toEqual({
      status: 'completed',
      postId: 'pub-1',
      releaseURL: 'https://www.tiktok.com/@me',
    });
  });

  it('completes an inbox upload with a link to the messages screen', async () => {
    stubFetch([['/publish/status/', () => envelope({ status: 'SEND_TO_USER_INBOX' })]]);

    await expect(provider.checkPostStatus('token', pendingData, integration)).resolves.toEqual({
      status: 'completed',
      releaseURL: 'https://www.tiktok.com/messages?lang=en',
      postId: 'missing',
    });
  });

  it('reports a failed publish with the reason TikTok gave', async () => {
    stubFetch([
      [
        '/publish/status/',
        () => envelope({ status: 'FAILED', reason: 'file_format_check_failed' }),
      ],
    ]);

    const error = await provider
      .checkPostStatus('token', pendingData, integration)
      .catch((e) => e);

    expect(error).toBeInstanceOf(BadBody);
    expect(error.message).toBe('File format is invalid, please check video specifications');
  });

  it('keeps polling through a transient status failure', async () => {
    stubFetch([
      ['/publish/status/', () => Response.json({ message: 'gateway' }, { status: 502 })],
    ]);

    await expect(
      provider.checkPostStatus('token', pendingData, integration)
    ).resolves.toMatchObject({ status: 'pending' });
  });

  it('surfaces a token failure hidden behind an HTTP 200 status envelope', async () => {
    stubFetch([['/publish/status/', () => envelope({}, 40001, 'access_token_invalid')]]);

    await expect(provider.checkPostStatus('token', pendingData, integration)).rejects.toBeInstanceOf(
      RefreshToken
    );
  });

  it('keeps polling on an unclassified non-zero code', async () => {
    stubFetch([['/publish/status/', () => envelope({}, 50000, 'who knows')]]);

    await expect(
      provider.checkPostStatus('token', pendingData, integration)
    ).resolves.toMatchObject({ status: 'pending' });
  });
});
