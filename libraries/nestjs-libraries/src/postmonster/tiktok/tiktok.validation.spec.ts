// postmonster: TikTok Direct Post rules and error mapping tests (PRD 8.2).
// One assertion per TT-ID where the rule allows it.
import {
  assetOn,
  cantPostMessage,
  isTikTokVideoPath,
  TikTokCantPostError,
  TikTokCreatorInfo,
  validateTikTokSettings,
  validateTikTokStaticSettings,
} from './tiktok.validation';
import {
  isTikTokCantPostCode,
  mapTikTokErrorBody,
  mapTikTokErrorCode,
} from './tiktok.errors';

const creator = (over: Partial<TikTokCreatorInfo> = {}): TikTokCreatorInfo => ({
  creator_avatar_url: 'https://example.com/a.png',
  creator_username: 'creator',
  creator_nickname: 'Creator',
  privacy_level_options: [
    'PUBLIC_TO_EVERYONE',
    'MUTUAL_FOLLOW_FRIENDS',
    'SELF_ONLY',
  ],
  comment_disabled: false,
  duet_disabled: false,
  stitch_disabled: false,
  max_video_post_duration_sec: 180,
  ...over,
});

const validSettings = {
  privacy_level: 'PUBLIC_TO_EVERYONE',
  comment: false,
  duet: false,
  stitch: false,
  disclose: false,
  brand_content_toggle: false,
  brand_organic_toggle: false,
};

const run = (over: any = {}, creatorOver: any = {}, extra: any = {}) =>
  validateTikTokSettings({
    settings: { ...validSettings, ...over },
    creator: creator(creatorOver),
    isPhoto: false,
    audited: true,
    videoDurationSec: 60,
    messageLength: 10,
    ...extra,
  });

const firstError = (result: any) =>
  result.ok === false ? result.errors[0] : undefined;

describe('validateTikTokSettings', () => {
  it('accepts a fully valid video post', () => {
    expect(run().ok).toBe(true);
  });

  // TT-05
  it('TT-05 requires a privacy selection', () => {
    const result = run({ privacy_level: undefined });
    expect(result.ok).toBe(false);
    expect(firstError(result)).toContain('select who can view this post');
  });

  it('TT-05 rejects a privacy option the account does not offer', () => {
    const result = run(
      { privacy_level: 'PUBLIC_TO_EVERYONE' },
      { privacy_level_options: ['MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'] }
    );
    expect(result.ok).toBe(false);
    expect(firstError(result)).toContain('not available for this TikTok account');
  });

  // TT-10
  it('TT-10 blocks Branded content with private visibility', () => {
    const result = run({
      privacy_level: 'SELF_ONLY',
      disclose: true,
      brand_content_toggle: true,
    });
    expect(result.ok).toBe(false);
    expect(firstError(result)).toBe(
      'Branded content visibility cannot be set to private.'
    );
  });

  it('TT-10 allows Branded content with public visibility', () => {
    const result = run({
      privacy_level: 'PUBLIC_TO_EVERYONE',
      disclose: true,
      brand_content_toggle: true,
    });
    expect(result.ok).toBe(true);
  });

  // TT-08
  it('TT-08 blocks disclosure toggle without a choice', () => {
    const result = run({ disclose: true });
    expect(result.ok).toBe(false);
    expect(firstError(result)).toBe(
      'You need to indicate if your content promotes yourself, a third party, or both.'
    );
  });

  it('TT-08 accepts disclosure with only Your brand', () => {
    const result = run({ disclose: true, brand_organic_toggle: true });
    expect(result.ok).toBe(true);
  });

  // TT-06
  it('TT-06 blocks Comment when the account disabled it', () => {
    const result = run({ comment: true }, { comment_disabled: true });
    expect(result.ok).toBe(false);
    expect(firstError(result)).toBe(
      'Comments are disabled in this TikTok account settings.'
    );
  });

  it('TT-06 blocks Duet when the account disabled it (video)', () => {
    const result = run({ duet: true }, { duet_disabled: true });
    expect(result.ok).toBe(false);
    expect(firstError(result)).toBe(
      'Duet is disabled in this TikTok account settings.'
    );
  });

  it('TT-06 ignores Duet/Stitch on photo posts', () => {
    const result = run(
      { duet: true, stitch: true },
      { duet_disabled: true, stitch_disabled: true },
      { isPhoto: true }
    );
    expect(result.ok).toBe(true);
  });

  // TT-03
  it('TT-03 blocks videos longer than the account limit', () => {
    const result = run({}, {}, { videoDurationSec: 200 });
    expect(result.ok).toBe(false);
    expect(firstError(result)).toBe(
      'This video is longer than the maximum duration allowed for this TikTok account (180 s).'
    );
  });

  it('TT-03 ignores duration on photo posts', () => {
    const result = run({}, {}, { isPhoto: true, videoDurationSec: 200 });
    expect(result.ok).toBe(true);
  });

  // TT-04
  it('TT-04 blocks a video caption over 2200 characters', () => {
    const result = run({}, {}, { messageLength: 2201 });
    expect(result.ok).toBe(false);
    expect(firstError(result)).toContain('too long');
  });

  it('TT-04 allows a photo description up to 4000 characters', () => {
    const result = run({}, {}, { isPhoto: true, messageLength: 4000 });
    expect(result.ok).toBe(true);
  });

  it('TT-04 blocks a photo title over 90 characters', () => {
    const result = run(
      { title: 'x'.repeat(91) },
      {},
      { isPhoto: true, messageLength: 5 }
    );
    expect(result.ok).toBe(false);
    expect(firstError(result)).toContain('title is too long');
  });

  // TT-22
  it('TT-22 forces private visibility while unaudited', () => {
    const result = validateTikTokSettings({
      settings: { ...validSettings, privacy_level: 'PUBLIC_TO_EVERYONE' },
      creator: creator({
        privacy_level_options: ['MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
      }),
      isPhoto: false,
      audited: false,
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.errors.join(' ')).toContain(
      'published as private (Only me)'
    );
  });

  it('TT-22 blocks Branded content while unaudited', () => {
    const result = validateTikTokSettings({
      settings: {
        ...validSettings,
        privacy_level: 'SELF_ONLY',
        disclose: true,
        brand_content_toggle: true,
      },
      creator: creator({
        privacy_level_options: ['MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
      }),
      isPhoto: false,
      audited: false,
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.errors.join(' ')).toContain(
      'Branded content is not available'
    );
  });

  it('TT-22 blocks posting to a public account while unaudited', () => {
    const result = validateTikTokSettings({
      settings: { ...validSettings, privacy_level: 'SELF_ONLY' },
      creator: creator(),
      isPhoto: false,
      audited: false,
    });
    expect(result.ok).toBe(false);
    expect(firstError(result)).toContain('private TikTok accounts');
  });

  it('TT-22 accepts an unaudited private post', () => {
    const result = validateTikTokSettings({
      settings: { ...validSettings, privacy_level: 'SELF_ONLY' },
      creator: creator({
        privacy_level_options: ['MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
      }),
      isPhoto: false,
      audited: false,
    });
    expect(result.ok).toBe(true);
  });
});

describe('validateTikTokStaticSettings', () => {
  it('requires privacy and rejects unknown values', () => {
    expect(validateTikTokStaticSettings({}, true)).toEqual([
      'Please select who can view this post.',
    ]);
    expect(
      validateTikTokStaticSettings({ privacy_level: 'SOMETHING' }, true)
    ).toEqual(['Unknown privacy option. Please select who can view this post.']);
  });

  it('TT-08/TT-10 hold without creator info', () => {
    expect(
      validateTikTokStaticSettings(
        { privacy_level: 'SELF_ONLY', disclose: true },
        true
      )
    ).toEqual([
      'You need to indicate if your content promotes yourself, a third party, or both.',
    ]);
    expect(
      validateTikTokStaticSettings(
        {
          privacy_level: 'SELF_ONLY',
          disclose: true,
          brand_content_toggle: true,
        },
        true
      )
    ).toEqual(['Branded content visibility cannot be set to private.']);
  });
});

describe('TikTok error mapping (TT-20)', () => {
  it('maps init and status codes to message + action', () => {
    expect(mapTikTokErrorCode('access_token_invalid')?.action).toBe('reconnect');
    expect(mapTikTokErrorCode('duration_check_failed')?.action).toBe('edit');
    expect(mapTikTokErrorCode('video_pull_failed')?.action).toBe('retry');
    expect(mapTikTokErrorCode('spam_risk_user_banned_from_posting')?.retryable).toBe(
      false
    );
    expect(mapTikTokErrorCode('unknown_code')).toBeUndefined();
  });

  it('prefers specific spam_risk codes over the generic one', () => {
    const mapped = mapTikTokErrorBody('{"error":{"code":"spam_risk_too_many_posts"}}');
    expect(mapped?.code).toBe('spam_risk_too_many_posts');
    expect(mapped?.message).toBe(cantPostMessage());
    expect(mapTikTokErrorBody('{"error":{"code":"spam_risk"}}')?.code).toBe(
      'spam_risk'
    );
  });

  it('TT-02: knows the can-not-post codes', () => {
    expect(isTikTokCantPostCode('spam_risk_too_many_posts')).toBe(true);
    expect(isTikTokCantPostCode('reached_active_user_cap')).toBe(true);
    expect(isTikTokCantPostCode('spam_risk')).toBe(false);
    const err = new TikTokCantPostError('spam_risk_too_many_posts');
    expect(err.message).toBe(cantPostMessage());
    expect(err.code).toBe('spam_risk_too_many_posts');
  });

  it('maps fail_reason strings from the status API', () => {
    expect(mapTikTokErrorCode('picture_size_check_failed')?.action).toBe('edit');
    expect(mapTikTokErrorCode('auth_removed')?.action).toBe('reconnect');
    expect(mapTikTokErrorCode('internal')?.retryable).toBe(true);
    expect(mapTikTokErrorCode('publish_cancelled')?.retryable).toBe(true);
  });

  it('assetOn treats booleans and legacy strings', () => {
    expect(assetOn(true)).toBe(true);
    expect(assetOn('yes')).toBe(true);
    expect(assetOn('true')).toBe(true);
    expect(assetOn(false)).toBe(false);
    expect(assetOn(undefined)).toBe(false);
  });

  it('recognizes every TikTok video format as video (MP4/WebM/MOV)', () => {
    expect(isTikTokVideoPath('https://x/uploads/a.mp4')).toBe(true);
    expect(isTikTokVideoPath('https://x/uploads/a.MOV')).toBe(true);
    expect(isTikTokVideoPath('https://x/uploads/a.webm')).toBe(true);
    expect(isTikTokVideoPath('https://x/uploads/a.jpeg')).toBe(false);
    expect(isTikTokVideoPath(undefined)).toBe(false);
  });
});
