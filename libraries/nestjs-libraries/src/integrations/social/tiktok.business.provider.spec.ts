vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { stubFetch } from '@gitroom/testing/http/fetch.stub';
import { BadBody, NotEnoughScopes, RefreshToken } from '../social.abstract';
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

describe('TiktokBusinessProvider.handleErrors full classification', () => {
  it.each([
    ['Too many requests', 'TikTok API rate limit exceeded, please try again later'],
    ['frame_rate_check_failed', 'Video frame rate is invalid, please check video specifications'],
    ['video_pull_failed', 'Failed to pull video from URL, please check the URL'],
    ['spam_risk_user_banned_from_posting', 'Account banned from posting, please check TikTok account status'],
    ['spam_risk_text', 'TikTok detected potential spam in the post text'],
    ['spam_risk', 'TikTok detected potential spam'],
    ['publish_cancelled', 'TikTok cancelled the upload, please try again'],
    ['invalid_params', 'Invalid request parameters, please check content format'],
    ['internal', 'There is a problem with TikTok servers, please try again later'],
    ['TikTok API error', 'TikTok API error, please try again'],
  ])('maps %j to its own message', (body, value) => {
    expect(provider.handleErrors(body)?.value).toBe(value);
  });

  it('keeps the daily user cap a failed post rather than a disconnect', () => {
    // No migration target is configured for this provider, and re-connecting
    // cannot reset a daily quota.
    expect(provider.handleErrors('reached_active_user_cap')?.type).toBe('bad-body');
  });
});

describe('TiktokBusinessProvider.refreshToken', () => {
  const tokenResponse = () =>
    envelope({ access_token: 'fresh', refresh_token: 'next', open_id: 'biz-1' });

  const businessInfo = () =>
    envelope({
      display_name: 'My Business',
      username: 'mybiz',
      profile_image: 'https://pic.test',
    });

  it('exchanges the refresh token and reads the business profile back', async () => {
    vi.stubEnv('TIKTOK_BUSINESS_CLIENT_ID', 'client');
    vi.stubEnv('TIKTOK_BUSINESS_CLIENT_SECRET', 'secret');
    stubFetch([
      ['/oauth2/refresh_token/', tokenResponse],
      ['/business/get/', businessInfo],
    ]);

    await expect(provider.refreshToken('old')).resolves.toMatchObject({
      // open_id doubles as the business_id of every later call, so it is kept
      // verbatim rather than normalised.
      id: 'biz-1',
      name: 'My Business',
      accessToken: 'fresh',
      refreshToken: 'next',
      picture: 'https://pic.test',
      username: 'mybiz',
    });
  });

  it('reports the reason when TikTok refuses the refresh behind an HTTP 200', async () => {
    stubFetch([['/oauth2/refresh_token/', () => envelope({}, 40001, 'access_token_invalid')]]);

    // Without this the destructure below would throw an unclassified TypeError.
    await expect(provider.refreshToken('old')).rejects.toBeInstanceOf(BadBody);
  });

  it('reports a success envelope that carries no token', async () => {
    stubFetch([['/oauth2/refresh_token/', () => envelope({ open_id: 'biz-1' })]]);

    await expect(provider.refreshToken('old')).rejects.toBeInstanceOf(BadBody);
  });

  it('reports a business lookup that came back with an error code', async () => {
    stubFetch([
      ['/oauth2/refresh_token/', tokenResponse],
      ['/business/get/', () => envelope({}, 40100, 'auth_removed')],
    ]);

    // Otherwise the channel is created with an undefined name and picture.
    await expect(provider.refreshToken('old')).rejects.toBeInstanceOf(BadBody);
  });
});

describe('TiktokBusinessProvider.authenticate', () => {
  const tokenResponse = (scope: string[] | string) =>
    envelope({ access_token: 'access', refresh_token: 'refresh', open_id: 'biz-1', scope });

  const businessInfo = () =>
    envelope({ display_name: 'My Business', username: 'mybiz', profile_image: '' });

  it('connects the channel when every scope was granted', async () => {
    vi.stubEnv('TIKTOK_BUSINESS_CLIENT_ID', 'client');
    vi.stubEnv('FRONTEND_URL', 'https://app.test');
    stubFetch([
      ['/oauth2/token/', () => tokenResponse(provider.scopes)],
      ['/business/get/', businessInfo],
    ]);

    await expect(
      provider.authenticate({ code: 'code', codeVerifier: 'verifier' })
    ).resolves.toMatchObject({ id: 'biz-1', accessToken: 'access', picture: '' });
  });

  it('refuses a connect that came back missing a scope', async () => {
    vi.stubEnv('TIKTOK_BUSINESS_CLIENT_ID', 'client');
    vi.stubEnv('FRONTEND_URL', 'https://app.test');
    stubFetch([
      ['/oauth2/token/', () => tokenResponse(['user.info.basic'])],
      ['/business/get/', businessInfo],
    ]);

    await expect(
      provider.authenticate({ code: 'code', codeVerifier: 'verifier' })
    ).rejects.toBeInstanceOf(NotEnoughScopes);
  });

  it('reports an expired auth code instead of a destructure error', async () => {
    vi.stubEnv('FRONTEND_URL', 'https://app.test');
    stubFetch([['/oauth2/token/', () => envelope({}, 40001, 'invalid_params')]]);

    await expect(
      provider.authenticate({ code: 'expired', codeVerifier: 'verifier' })
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('sends the trailing-slash redirect uri the developer portal registered', async () => {
    vi.stubEnv('TIKTOK_BUSINESS_CLIENT_ID', 'client');
    vi.stubEnv('FRONTEND_URL', 'https://app.test');
    const fetch = stubFetch([
      ['/oauth2/token/', () => tokenResponse(provider.scopes)],
      ['/business/get/', businessInfo],
    ]);

    await provider.authenticate({ code: 'code', codeVerifier: 'verifier' });

    // The token exchange fails outright if this does not match the registered
    // redirect, trailing slash included.
    expect(fetch.body('/oauth2/token/').redirect_uri).toBe(
      'https://app.test/integrations/social/tiktok-business/'
    );
  });

  it('routes a plain-http development frontend through redirectmeto', async () => {
    vi.stubEnv('FRONTEND_URL', 'http://localhost:4200');
    const fetch = stubFetch([
      ['/oauth2/token/', () => tokenResponse(provider.scopes)],
      ['/business/get/', businessInfo],
    ]);

    await provider.authenticate({ code: 'code', codeVerifier: 'verifier' });

    expect(fetch.body('/oauth2/token/').redirect_uri).toBe(
      'https://redirectmeto.com/http://localhost:4200/integrations/social/tiktok-business/'
    );
  });
});

describe('TiktokBusinessProvider.generateAuthUrl', () => {
  it('asks for every scope and disables the auto-auth shortcut', async () => {
    vi.stubEnv('TIKTOK_BUSINESS_CLIENT_ID', 'client');
    vi.stubEnv('FRONTEND_URL', 'https://app.test');

    const { url, state, codeVerifier } = await provider.generateAuthUrl();

    expect(decodeURIComponent(url)).toContain(provider.scopes.join(','));
    expect(url).toContain('disable_auto_auth=1');
    expect(url).toContain(`state=${state}`);
    expect(codeVerifier).toBe(state);
  });
});

describe('TiktokBusinessProvider.post blocking behaviour', () => {
  it('returns as soon as the status check completes', async () => {
    const fetch = stubFetch([
      ['/business/video/publish/', () => envelope({ share_id: 'pub-1' })],
      [
        '/publish/status/',
        () => envelope({ status: 'PUBLISH_COMPLETE', post_ids: ['42'] }),
      ],
    ]);

    await expect(
      provider.post('biz-1', 'token', [post()] as never, integration)
    ).resolves.toEqual([
      {
        id: 'post-1',
        postId: '42',
        releaseURL: 'https://www.tiktok.com/@me/video/42',
        status: 'success',
      },
    ]);
    expect(fetch.countTo('/publish/status/')).toBe(1);
  });

  it('gives up as a terminal failure once the check budget is exhausted', async () => {
    const fetch = stubFetch([
      ['/business/video/publish/', () => envelope({ share_id: 'pub-1' })],
      ['/publish/status/', () => envelope({ status: 'PROCESSING_UPLOAD' })],
    ]);

    await expect(
      provider.post('biz-1', 'token', [post()] as never, integration)
    ).rejects.toBeInstanceOf(BadBody);
    expect(fetch.countTo('/publish/status/')).toBe(27);
  });

  it('stops before the activity timeout rather than letting it be retried', async () => {
    const fetch = stubFetch([
      ['/business/video/publish/', () => envelope({ share_id: 'pub-1' })],
      ['/publish/status/', () => envelope({ status: 'PROCESSING_UPLOAD' })],
    ]);

    const realNow = Date.now();
    let calls = 0;
    const now = vi.spyOn(Date, 'now').mockImplementation(() => realNow + calls++ * 5 * 60 * 1000);

    // A timed-out activity is retried and publishes the video again.
    await expect(
      provider.post('biz-1', 'token', [post()] as never, integration)
    ).rejects.toBeInstanceOf(BadBody);
    expect(fetch.countTo('/publish/status/')).toBeLessThan(27);

    now.mockRestore();
  });
});

describe('TiktokBusinessProvider.musicSearch', () => {
  const track = (over: Record<string, unknown> = {}) => ({
    full_duration_song_clip: { song_clip_id: 'clip-1' },
    commercial_music_name: 'A Song',
    artist: 'An Artist',
    thumbnail_url: 'https://pic.test',
    duration: 30,
    preview_url: 'https://preview.test',
    ...over,
  });

  it('returns the publishable clip id, not the commercial music id', async () => {
    stubFetch([['/trending_list/', () => envelope({ list: [track({ commercial_music_id: 'cm-1' })] })]]);

    // The publish endpoints reject a commercial_music_id with a generic
    // "Something is wrong" error.
    await expect(provider.musicSearch('token', {}, 'biz-1')).resolves.toEqual([
      {
        id: 'clip-1',
        title: 'A Song',
        artist: 'An Artist',
        image: 'https://pic.test',
        duration: 30000,
        previewUrl: 'https://preview.test',
      },
    ]);
  });

  it('falls back to the trending clip for a chart track with no full-length clip', async () => {
    stubFetch([
      [
        '/trending_list/',
        () =>
          envelope({
            list: [
              track({
                full_duration_song_clip: undefined,
                duration: undefined,
                preview_url: undefined,
                trending_song_clip: {
                  song_clip_id: 'clip-2',
                  duration: 15,
                  preview_url: 'https://preview2.test',
                },
              }),
            ],
          }),
      ],
    ]);

    await expect(provider.musicSearch('token', {}, 'biz-1')).resolves.toMatchObject([
      { id: 'clip-2', duration: 15000, previewUrl: 'https://preview2.test' },
    ]);
  });

  it('drops a track that has no publishable clip at all', async () => {
    stubFetch([
      [
        '/trending_list/',
        () => envelope({ list: [track({ full_duration_song_clip: undefined })] }),
      ],
    ]);

    await expect(provider.musicSearch('token', {}, 'biz-1')).resolves.toEqual([]);
  });

  it('passes the genre filter through', async () => {
    const fetch = stubFetch([['/trending_list/', () => envelope({ list: [] })]]);

    await provider.musicSearch('token', { genre: 'POP' }, 'biz-1');

    expect(fetch.urls()[0]).toContain('genre=POP');
  });

  it('surfaces a token failure so the endpoint refreshes and retries', async () => {
    stubFetch([['/trending_list/', () => envelope({}, 40001, 'access_token_invalid')]]);

    await expect(provider.musicSearch('token', {}, 'biz-1')).rejects.toBeInstanceOf(RefreshToken);
  });

  it('returns no tracks for any other failure', async () => {
    stubFetch([['/trending_list/', () => envelope({}, 50000, 'internal')]]);

    await expect(provider.musicSearch('token', {}, 'biz-1')).resolves.toEqual([]);
  });
});

describe('TiktokBusinessProvider.locationSearch', () => {
  it('returns nothing without a query, and asks TikTok nothing', async () => {
    const fetch = stubFetch([]);

    await expect(provider.locationSearch('token', { q: '' }, 'biz-1')).resolves.toEqual([]);
    expect(fetch.calls).toHaveLength(0);
  });

  it('maps the matching locations', async () => {
    stubFetch([
      [
        '/publish/location/',
        () =>
          envelope({
            locations: [
              { location_id: 'l1', location_name: 'A Cafe', location_address: '1 Road' },
            ],
          }),
      ],
    ]);

    await expect(provider.locationSearch('token', { q: 'cafe' }, 'biz-1')).resolves.toEqual([
      { id: 'l1', name: 'A Cafe', address: '1 Road' },
    ]);
  });

  it('truncates an over-long query rather than letting TikTok reject it', async () => {
    const fetch = stubFetch([['/publish/location/', () => envelope({ locations: [] })]]);

    await provider.locationSearch('token', { q: 'x'.repeat(200) }, 'biz-1');

    const url = decodeURIComponent(fetch.urls()[0]);
    expect(url).toContain(`search_query=${'x'.repeat(100)}`);
    expect(url).not.toContain('x'.repeat(101));
  });

  it('surfaces a token failure so the endpoint refreshes and retries', async () => {
    stubFetch([['/publish/location/', () => envelope({}, 40001, 'access_token_invalid')]]);

    await expect(
      provider.locationSearch('token', { q: 'cafe' }, 'biz-1')
    ).rejects.toBeInstanceOf(RefreshToken);
  });
});

describe('TiktokBusinessProvider.analytics', () => {
  const accountStats = () =>
    envelope({ followers_count: 10, following_count: 5, total_likes: 100, videos_count: 3 });

  it('reports the account totals', async () => {
    stubFetch([
      ['/business/get/', accountStats],
      ['/business/video/list/', () => envelope({ videos: [] })],
    ]);

    const result = await provider.analytics('biz-1', 'token', 7);

    expect(result.map((r) => r.label)).toEqual(['Followers', 'Following', 'Total Likes', 'Videos']);
  });

  it('aggregates the engagement of the recent videos', async () => {
    stubFetch([
      ['/business/get/', accountStats],
      [
        '/business/video/list/',
        () =>
          envelope({
            videos: [
              { item_id: 'v1', video_views: 100, likes: 10, comments: 1, shares: 2 },
              { item_id: 'v2', video_views: 50, likes: 5, comments: 0, shares: 1 },
            ],
          }),
      ],
    ]);

    const byLabel = Object.fromEntries(
      (await provider.analytics('biz-1', 'token', 7)).map((r) => [r.label, r.data[0].total])
    );

    expect(byLabel).toMatchObject({
      Views: '150',
      'Recent Likes': '15',
      'Recent Comments': '1',
      'Recent Shares': '3',
    });
  });

  it('surfaces a token failure so the panel refreshes instead of showing nothing', async () => {
    stubFetch([['/business/get/', () => envelope({}, 40001, 'access_token_invalid')]]);

    await expect(provider.analytics('biz-1', 'token', 7)).rejects.toBeInstanceOf(RefreshToken);
  });

  it('returns nothing for any other failure rather than breaking the dashboard', async () => {
    stubFetch([
      [
        '/business/get/',
        () => {
          throw new Error('TikTok down');
        },
      ],
    ]);

    await expect(provider.analytics('biz-1', 'token', 7)).resolves.toEqual([]);
  });
});

describe('TiktokBusinessProvider.missing', () => {
  it('lists the recent videos with their thumbnails', async () => {
    stubFetch([
      [
        '/business/video/list/',
        () => envelope({ videos: [{ item_id: 1, thumbnail_url: 'https://cover.test/1.jpg' }] }),
      ],
    ]);

    await expect(provider.missing('biz-1', 'token')).resolves.toEqual([
      { id: '1', url: 'https://cover.test/1.jpg' },
    ]);
  });

  it('returns nothing when the account has no videos', async () => {
    stubFetch([['/business/video/list/', () => envelope({ videos: [] })]]);

    await expect(provider.missing('biz-1', 'token')).resolves.toEqual([]);
  });

  it('surfaces a token failure so the caller refreshes and retries', async () => {
    stubFetch([['/business/video/list/', () => envelope({}, 40001, 'access_token_invalid')]]);

    await expect(provider.missing('biz-1', 'token')).rejects.toBeInstanceOf(RefreshToken);
  });

  it('returns nothing for any other failure', async () => {
    stubFetch([
      ['/business/video/list/', () => Response.json({ message: 'nope' }, { status: 500 })],
    ]);

    await expect(provider.missing('biz-1', 'token')).resolves.toEqual([]);
  });
});

describe('TiktokBusinessProvider.postAnalytics', () => {
  const videoMetrics = () =>
    envelope({
      videos: [{ item_id: '42', video_views: 100, likes: 10, comments: 2, shares: 1 }],
    });

  it('reports the metrics of a published video', async () => {
    stubFetch([['/business/video/list/', videoMetrics]]);

    const result = await provider.postAnalytics('biz-1', 'token', '42', 7);

    expect(result.map((r) => r.label)).toEqual(['Views', 'Likes', 'Comments', 'Shares']);
  });

  it('resolves a stored share id into the real post id first', async () => {
    const fetch = stubFetch([
      ['/business/publish/status/', () => envelope({ post_ids: [42] })],
      ['/business/video/list/', videoMetrics],
    ]);

    // Posts saved before post_ids became available kept the share_id.
    await expect(
      provider.postAnalytics('biz-1', 'token', 'v_pub_url~1234', 7)
    ).resolves.toHaveLength(4);

    expect(decodeURIComponent(fetch.urls()[1])).toContain('{"video_ids":["42"]}');
  });

  it('returns nothing while the share id has still not resolved', async () => {
    stubFetch([['/business/publish/status/', () => envelope({})]]);

    await expect(provider.postAnalytics('biz-1', 'token', 'p_pub_url~1234', 7)).resolves.toEqual(
      []
    );
  });

  it('returns nothing when the video is gone', async () => {
    stubFetch([['/business/video/list/', () => envelope({ videos: [] })]]);

    await expect(provider.postAnalytics('biz-1', 'token', '42', 7)).resolves.toEqual([]);
  });

  it('surfaces a token failure so the panel refreshes', async () => {
    stubFetch([['/business/video/list/', () => envelope({}, 40001, 'access_token_invalid')]]);

    await expect(provider.postAnalytics('biz-1', 'token', '42', 7)).rejects.toBeInstanceOf(
      RefreshToken
    );
  });
});

describe('TiktokBusinessProvider.maxLength', () => {
  it('uses the video caption limit, which is the lower of the two', () => {
    // Photos allow 4,000, videos 2,200 - validating against the higher one
    // would let a video post through that TikTok then rejects.
    expect(provider.maxLength()).toBe(2200);
  });
});

describe('TiktokBusinessProvider music selection without a stub', () => {
  it('attaches a track picked from the live trending list', async () => {
    const fetch = stubFetch([
      [
        '/trending_list/',
        () =>
          envelope({
            list: [{ full_duration_song_clip: { song_clip_id: 'clip-7' } }],
          }),
      ],
      ['/business/photo/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    await provider.postPending(
      'biz-1',
      'token',
      [post({ media: [{ path: '/a.jpg' }], settings: { autoAddMusic: 'yes' } })] as never,
      integration
    );

    expect(fetch.body('/publish/').post_info.music_sound_info).toEqual({
      music_sound_id: 'clip-7',
    });
  });

  it('does not pick a track for a draft, which cannot carry music', async () => {
    const fetch = stubFetch([['/business/photo/publish/', () => envelope({ share_id: 'pub-1' })]]);

    await provider.postPending(
      'biz-1',
      'token',
      [
        post({
          media: [{ path: '/a.jpg' }],
          settings: { autoAddMusic: 'yes', content_posting_method: 'UPLOAD' },
        }),
      ] as never,
      integration
    );

    expect(fetch.countTo('/trending_list/')).toBe(0);
    expect(fetch.body('/publish/').post_info).toEqual({
      caption: 'hello from the test suite',
      is_brand_organic: false,
      is_branded_content: false,
      is_draft: true,
    });
  });
});

describe('TiktokBusinessProvider optional field fallbacks', () => {
  it('defaults the track fields TikTok left out', async () => {
    stubFetch([
      ['/trending_list/', () => envelope({ list: [{ full_duration_song_clip: { song_clip_id: 'c1' } }] })],
    ]);

    await expect(provider.musicSearch('token', {}, 'biz-1')).resolves.toEqual([
      { id: 'c1', title: '', artist: '', image: '', duration: 0, previewUrl: '' },
    ]);
  });

  it('defaults the location fields TikTok left out', async () => {
    stubFetch([['/publish/location/', () => envelope({ locations: [{ location_id: 'l1' }] })]]);

    await expect(provider.locationSearch('token', { q: 'cafe' }, 'biz-1')).resolves.toEqual([
      { id: 'l1', name: '', address: '' },
    ]);
  });

  it('offsets the thumbnail when no custom one was uploaded', async () => {
    const fetch = stubFetch([
      ['/business/video/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    await provider.postPending(
      'biz-1',
      'token',
      [post({ media: [{ path: '/clip.mp4', thumbnailTimestamp: 3 }] })] as never,
      integration
    );

    expect(fetch.body('/publish/')).toMatchObject({ thumbnail_offset: 3 });
  });

  it('sends no thumbnail fields when the post has neither', async () => {
    const fetch = stubFetch([
      ['/business/video/publish/', () => envelope({ share_id: 'pub-1' })],
    ]);

    await provider.postPending('biz-1', 'token', [post()] as never, integration);

    const body = fetch.body('/publish/');
    expect(body).not.toHaveProperty('custom_thumbnail_url');
    expect(body).not.toHaveProperty('thumbnail_offset');
  });

  it('reports a failed publish that came with no reason at all', async () => {
    stubFetch([['/publish/status/', () => envelope({ status: 'FAILED' })]]);

    const error = await provider
      .checkPostStatus('token', { publishId: 'pub-1' }, integration)
      .catch((e) => e);

    expect(error).toBeInstanceOf(BadBody);
    expect(error.message).toBe('');
  });

  it('omits an account stat TikTok did not return', async () => {
    stubFetch([
      ['/business/get/', () => envelope({ followers_count: 10 })],
      ['/business/video/list/', () => envelope({ videos: [] })],
    ]);

    await expect(provider.analytics('biz-1', 'token', 7)).resolves.toHaveLength(1);
  });

  it('counts a video with no engagement fields as zero rather than NaN', async () => {
    stubFetch([
      ['/business/get/', () => envelope({})],
      ['/business/video/list/', () => envelope({ videos: [{ item_id: 'v1' }] })],
    ]);

    const byLabel = Object.fromEntries(
      (await provider.analytics('biz-1', 'token', 7)).map((r) => [r.label, r.data[0].total])
    );

    expect(byLabel).toMatchObject({ Views: '0', 'Recent Likes': '0' });
  });

  it('omits a post metric TikTok did not return', async () => {
    stubFetch([
      ['/business/video/list/', () => envelope({ videos: [{ item_id: '42', likes: 3 }] })],
    ]);

    await expect(provider.postAnalytics('biz-1', 'token', '42', 7)).resolves.toEqual([
      { label: 'Likes', percentageChange: 0, data: [{ total: '3', date: expect.any(String) }] },
    ]);
  });

  it('returns no post metrics rather than breaking the panel on an unexpected failure', async () => {
    stubFetch([
      [
        '/business/video/list/',
        () => {
          throw new Error('TikTok down');
        },
      ],
    ]);

    await expect(provider.postAnalytics('biz-1', 'token', '42', 7)).resolves.toEqual([]);
  });
});
