// postmonster: TikTok panel behavior tests (PRD TT-02/03/05/06/08/10, TT-17).
// The panel logic is extracted into pure functions so the rules run against a
// mocked creator_info in plain node (jsdom is not usable in this repo: the
// hoisted `canvas` native binding is broken on Windows CI images). The DOM
// layer (checkbox wiring, focus, tooltips) is covered by the manual browser
// pass in docs/tiktok-review/manual-test-log.md.
import {
  computeTikTokBlockers,
  resolveBrandedPrivacySwitch,
  stripTikTokSettings,
  TikTokPanelState,
} from './tiktok.gate';
import { assetOn, validateTikTokSettings } from '@gitroom/nestjs-libraries/postmonster/tiktok/tiktok.validation';

const creator = (over: any = {}) => ({
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

const baseState = (over: Partial<TikTokPanelState> = {}): TikTokPanelState => ({
  loading: false,
  reconnect: false,
  canPost: true,
  creator: creator(),
  hasMedia: true,
  isVideo: false,
  isPhotoTitle: false,
  privacy: 'PUBLIC_TO_EVERYONE',
  disclose: false,
  brandOrganic: false,
  brandContent: false,
  ...over,
});

describe('TikTok panel defaults (TT-05/TT-06)', () => {
  it('asks for a privacy selection and blocks publishing without it', () => {
    expect(computeTikTokBlockers(baseState({ privacy: undefined }))).toContain(
      'Select who can view this post'
    );
  });

  it('treats all interaction toggles as off when unset', () => {
    expect(assetOn(undefined)).toBe(false);
    // no interaction blockers: they default to off and stay optional
    const blockers = computeTikTokBlockers(baseState());
    expect(blockers).toEqual([]);
  });

  it('rejects a privacy option the account does not offer', () => {
    const state = baseState({
      creator: creator({
        privacy_level_options: ['MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
      }),
    });
    expect(computeTikTokBlockers(state)).toContain(
      'The selected privacy option is not available for this account'
    );
  });
});

describe('TikTok panel blockers (TT-02/TT-03/TT-08)', () => {
  it('TT-02 blocks publishing when the account can not post now', () => {
    const state = baseState({ canPost: false, creator: null });
    expect(computeTikTokBlockers(state)).toContain(
      "This TikTok account can't publish more posts right now. Please try again later."
    );
  });

  it('TT-03 blocks a video longer than the account limit', () => {
    const state = baseState({
      isVideo: true,
      videoDurationSec: 300,
    });
    expect(computeTikTokBlockers(state).join(' ')).toContain(
      'This video is longer than the maximum duration allowed for this TikTok account (180 s).'
    );
  });

  it('TT-03 accepts a video exactly at the limit', () => {
    const state = baseState({ isVideo: true, videoDurationSec: 180 });
    expect(computeTikTokBlockers(state)).toEqual([]);
  });

  it('TT-08 blocks the disclosure toggle without a choice', () => {
    const state = baseState({ disclose: true, privacy: 'SELF_ONLY' });
    expect(computeTikTokBlockers(state)).toContain(
      'Indicate if your content promotes yourself, a third party, or both'
    );
  });

  it('TT-08 accepts the disclosure toggle with Your brand only', () => {
    const state = baseState({
      disclose: true,
      brandOrganic: true,
      privacy: 'PUBLIC_TO_EVERYONE',
    });
    expect(computeTikTokBlockers(state)).toEqual([]);
  });

  it('TT-06: an interaction disabled in the account settings is refused at publish', () => {
    const result = validateTikTokSettings({
      settings: { privacy_level: 'SELF_ONLY', comment: true },
      creator: creator({ comment_disabled: true }),
      isPhoto: false,
      audited: true,
    });
    expect(result.ok).toBe(false);
  });
});

describe('Branded content vs private visibility (TT-10)', () => {
  it('switches private visibility to Everyone for Branded content', () => {
    const result = resolveBrandedPrivacySwitch('SELF_ONLY', true, [
      'PUBLIC_TO_EVERYONE',
      'MUTUAL_FOLLOW_FRIENDS',
      'SELF_ONLY',
    ]);
    expect(result.nextPrivacy).toBe('PUBLIC_TO_EVERYONE');
    expect(result.notice).toBe(
      'Branded content visibility cannot be set to private. Visibility was set to Everyone.'
    );
  });

  it('falls back to the most open option on a private account', () => {
    const result = resolveBrandedPrivacySwitch('SELF_ONLY', true, [
      'FOLLOWER_OF_CREATOR',
      'MUTUAL_FOLLOW_FRIENDS',
      'SELF_ONLY',
    ]);
    expect(result.nextPrivacy).toBe('FOLLOWER_OF_CREATOR');
  });

  it('does not touch a non-private visibility', () => {
    expect(
      resolveBrandedPrivacySwitch('PUBLIC_TO_EVERYONE', true, [
        'PUBLIC_TO_EVERYONE',
        'SELF_ONLY',
      ])
    ).toEqual({ nextPrivacy: null });
    expect(
      resolveBrandedPrivacySwitch('SELF_ONLY', false, [
        'PUBLIC_TO_EVERYONE',
        'SELF_ONLY',
      ])
    ).toEqual({ nextPrivacy: null });
  });
});

describe('Duplicate post resets TikTok settings (TT-17)', () => {
  it('clears TikTok settings but keeps text/media', () => {
    const stripped = stripTikTokSettings(
      {
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disclose: true,
        brand_content_toggle: true,
        brand_organic_toggle: true,
        comment: true,
        duet: true,
        stitch: true,
        videoDurationSec: 120,
        title: 'photo title',
      },
      'tiktok'
    );
    expect(stripped).toEqual({});
  });

  it('leaves other providers untouched', () => {
    const settings = { title: 'keep me', comment: true };
    expect(stripTikTokSettings(settings, 'x')).toEqual(settings);
    expect(stripTikTokSettings(settings, undefined)).toEqual(settings);
    expect(stripTikTokSettings(settings, 'reddit')).toEqual(settings);
  });
});
