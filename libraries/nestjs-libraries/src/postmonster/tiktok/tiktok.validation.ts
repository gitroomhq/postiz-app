// postmonster: TikTok post settings validation (PRD TT-02..TT-10, TT-16, TT-22, TT-23).
// Pure functions, shared by the provider's publish-time revalidation and tests.
// Sources checked 2026-09-30:
// - docs/en/content-sharing-guidelines (Required UX Implementation)
// - docs/en/content-posting-api-reference-query-creator-info
// - docs/en/content-posting-api-reference-photo-post

export type TikTokPrivacyLevel =
  | 'PUBLIC_TO_EVERYONE'
  | 'MUTUAL_FOLLOW_FRIENDS'
  | 'FOLLOWER_OF_CREATOR'
  | 'SELF_ONLY';

export const TIKTOK_PRIVACY_OPTIONS: TikTokPrivacyLevel[] = [
  'PUBLIC_TO_EVERYONE',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWER_OF_CREATOR',
  'SELF_ONLY',
];

// creator_info/query response fields we rely on.
export interface TikTokCreatorInfo {
  creator_avatar_url: string;
  creator_username: string;
  creator_nickname: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
}

export interface TikTokPostSettings {
  title?: string;
  privacy_level?: string;
  comment?: boolean | string;
  duet?: boolean | string;
  stitch?: boolean | string;
  disclose?: boolean | string;
  brand_content_toggle?: boolean | string;
  brand_organic_toggle?: boolean | string;
}

export interface TikTokValidationParams {
  settings: TikTokPostSettings;
  creator: TikTokCreatorInfo;
  isPhoto: boolean;
  // TIKTOK_AUDITED env: while false the client is unaudited (TT-18/TT-22).
  audited: boolean;
  // Video duration in seconds, when known (TT-03, TT-16).
  videoDurationSec?: number;
  // Caption/description length in UTF-16 runes (TT-04).
  messageLength?: number;
}

export type TikTokValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export const TIKTOK_LIMITS = {
  // UTF-16 runes, docs/en/content-posting-api-reference-direct-post (video title)
  videoTitleMax: 2200,
  // docs/en/content-posting-api-reference-photo-post
  photoTitleMax: 90,
  photoDescriptionMax: 4000,
  photoMaxCount: 35,
};

export function assetOn(value: boolean | string | undefined): boolean {
  return value === true || value === 'true' || value === 'yes';
}

// TikTok video formats (Media Transfer Guide: MP4/WebM/MOV). The media-type
// split in the composer and provider is extension-based - upstream only knew
// about mp4 and silently treated MOV/WebM as photos.
export function isTikTokVideoPath(path?: string | null): boolean {
  if (!path) {
    return false;
  }
  const lower = path.toLowerCase();
  return ['.mp4', '.mov', '.webm'].some((ext) => lower.indexOf(ext) > -1);
}

function countUtf16(value: string): number {
  return value ? value.length : 0;
}

// TT-02: "the creator can not make more posts at this moment".
export function cantPostMessage(): string {
  return "This TikTok account can't publish more posts right now. Please try again later.";
}

// Thrown when creator_info/query reports one of TIKTOK_CANT_POST_CODES
// (they arrive as error.code with HTTP 200).
export class TikTokCantPostError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(cantPostMessage());
    this.name = 'TikTokCantPostError';
    this.code = code;
  }
}

export function durationMessage(maxSec: number): string {
  return `This video is longer than the maximum duration allowed for this TikTok account (${maxSec} s).`;
}

// Settings-only rules (no creator_info needed): TT-05 (privacy present),
// TT-08 (disclosure without a choice), TT-10 (branded + private),
// TT-22 (unaudited). Used at save/validate time and again at publish time.
export function validateTikTokStaticSettings(
  settings: TikTokPostSettings,
  audited: boolean
): string[] {
  const errors: string[] = [];
  const privacy = settings.privacy_level;
  const branded = assetOn(settings.brand_content_toggle);
  const yourBrand = assetOn(settings.brand_organic_toggle);
  const disclose = assetOn(settings.disclose);

  if (!privacy) {
    errors.push('Please select who can view this post.');
  } else if ((TIKTOK_PRIVACY_OPTIONS as string[]).indexOf(privacy) === -1) {
    errors.push('Unknown privacy option. Please select who can view this post.');
  }

  if (branded && privacy === 'SELF_ONLY') {
    errors.push('Branded content visibility cannot be set to private.');
  }

  if (disclose && !branded && !yourBrand) {
    errors.push(
      'You need to indicate if your content promotes yourself, a third party, or both.'
    );
  }

  if (!audited) {
    if (privacy && privacy !== 'SELF_ONLY') {
      errors.push(
        "While Postmonster's TikTok integration is under review, posts are published as private (Only me)."
      );
    }
    if (branded) {
      errors.push(
        "While Postmonster's TikTok integration is under review, Branded content is not available."
      );
    }
  }

  return errors;
}

// The full post settings validation against the latest creator info.
// Every mismatch is reported - no setting is silently changed (TT-16).
export function validateTikTokSettings(
  params: TikTokValidationParams
): TikTokValidationResult {
  const { settings, creator, isPhoto, audited, videoDurationSec, messageLength } =
    params;
  const errors: string[] = [];

  // TT-05: privacy is mandatory and must be one of the creator's options.
  const privacy = settings.privacy_level;
  if (!privacy) {
    errors.push('Please select who can view this post.');
  } else if ((TIKTOK_PRIVACY_OPTIONS as string[]).indexOf(privacy) === -1) {
    errors.push('Unknown privacy option. Please select who can view this post.');
  } else if (
    (creator?.privacy_level_options || []).indexOf(privacy) === -1
  ) {
    errors.push(
      'The selected privacy option is not available for this TikTok account. Please select another visibility option.'
    );
  }

  // TT-10 (variant B) + TT-07: branded content can never be private.
  const branded = assetOn(settings.brand_content_toggle);
  const yourBrand = assetOn(settings.brand_organic_toggle);
  const disclose = assetOn(settings.disclose);
  if (branded && privacy === 'SELF_ONLY') {
    errors.push('Branded content visibility cannot be set to private.');
  }

  // TT-08: disclosure on means at least one of the two options.
  if (disclose && !branded && !yourBrand) {
    errors.push(
      'You need to indicate if your content promotes yourself, a third party, or both.'
    );
  }

  // TT-06: interactions disabled in the TikTok account settings.
  if (assetOn(settings.comment) && creator?.comment_disabled) {
    errors.push('Comments are disabled in this TikTok account settings.');
  }
  if (!isPhoto && assetOn(settings.duet) && creator?.duet_disabled) {
    errors.push('Duet is disabled in this TikTok account settings.');
  }
  if (!isPhoto && assetOn(settings.stitch) && creator?.stitch_disabled) {
    errors.push('Stitch is disabled in this TikTok account settings.');
  }

  // TT-03: video duration vs the creator's current limit.
  if (
    !isPhoto &&
    typeof videoDurationSec === 'number' &&
    typeof creator?.max_video_post_duration_sec === 'number' &&
    creator.max_video_post_duration_sec > 0 &&
    videoDurationSec > creator.max_video_post_duration_sec
  ) {
    errors.push(durationMessage(creator.max_video_post_duration_sec));
  }

  // TT-04: caption limits (UTF-16 runes).
  if (typeof messageLength === 'number') {
    const max = isPhoto
      ? TIKTOK_LIMITS.photoDescriptionMax
      : TIKTOK_LIMITS.videoTitleMax;
    if (messageLength > max) {
      errors.push(
        `The description is too long (${messageLength} of ${max} characters).`
      );
    }
    if (
      isPhoto &&
      settings.title &&
      countUtf16(settings.title) > TIKTOK_LIMITS.photoTitleMax
    ) {
      errors.push(
        `The title is too long (${countUtf16(settings.title)} of ${TIKTOK_LIMITS.photoTitleMax} characters).`
      );
    }
  }

  // TT-22: unaudited client restrictions.
  if (!audited) {
    if (privacy && privacy !== 'SELF_ONLY') {
      errors.push(
        "While Postmonster's TikTok integration is under review, posts are published as private (Only me)."
      );
    }
    if (branded) {
      errors.push(
        "While Postmonster's TikTok integration is under review, Branded content is not available."
      );
    }
    if ((creator?.privacy_level_options || []).indexOf('PUBLIC_TO_EVERYONE') > -1) {
      errors.push(
        "While Postmonster's TikTok integration is under review, posts can only go to private TikTok accounts."
      );
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}
