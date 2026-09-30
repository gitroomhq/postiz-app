// postmonster: TikTok error and fail_reason mapping (PRD TT-20).
// Sources (TikTok for Developers, docs checked 2026-09-30):
// - Direct Post error codes: docs/en/content-posting-api-reference-direct-post
// - Photo Post error codes: docs/en/content-posting-api-reference-photo-post
// - Get Post Status fail reasons: docs/en/content-posting-api-reference-get-video-status
// - Query Creator Info error codes: docs/en/content-posting-api-reference-query-creator-info
// Action tells the UI what to offer next to the user: Reconnect the channel,
// Edit the post, or Retry the publish.

export type TikTokErrorAction = 'reconnect' | 'edit' | 'retry';

export interface TikTokErrorMapping {
  code: string;
  message: string;
  action: TikTokErrorAction;
  // Whether a plain Retry of the same post can succeed without user changes.
  retryable: boolean;
}

// Codes that mean "this account can not make more posts right now" (TT-02).
// The creator_info/query endpoint reports them as error.code with HTTP 200.
export const TIKTOK_CANT_POST_CODES = [
  'spam_risk_too_many_posts',
  'spam_risk_user_banned_from_posting',
  'reached_active_user_cap',
];

const MAPPINGS: TikTokErrorMapping[] = [
  // --- Authentication / authorization -> Reconnect ---
  {
    code: 'access_token_invalid',
    message: 'Your TikTok session has expired. Please reconnect the TikTok channel.',
    action: 'reconnect',
    retryable: false,
  },
  {
    code: 'scope_not_authorized',
    message: 'Missing TikTok permissions. Please reconnect the TikTok channel.',
    action: 'reconnect',
    retryable: false,
  },
  {
    code: 'scope_permission_missed',
    message: 'Missing TikTok permissions. Please reconnect the TikTok channel.',
    action: 'reconnect',
    retryable: false,
  },
  {
    code: 'auth_removed',
    message: 'This TikTok account removed Postmonster\'s access while the post was uploading. Please reconnect the TikTok channel.',
    action: 'reconnect',
    retryable: false,
  },
  {
    code: 'reached_active_user_cap',
    message: "TikTok's daily limit of publishing users for this integration is reached. Please try again tomorrow or contact support.",
    action: 'reconnect',
    retryable: false,
  },

  // --- Account can not post right now (TT-02) ---
  {
    code: 'spam_risk_too_many_posts',
    message: "This TikTok account can't publish more posts right now. Please try again later.",
    action: 'retry',
    retryable: true,
  },
  {
    code: 'spam_risk_user_banned_from_posting',
    message: 'TikTok has banned this account from making new posts. Please check the account in the TikTok app.',
    action: 'edit',
    retryable: false,
  },

  // --- Content / settings -> Edit ---
  {
    code: 'duration_check_failed',
    message: 'This video is longer than the maximum duration allowed for this TikTok account.',
    action: 'edit',
    retryable: false,
  },
  {
    code: 'file_format_check_failed',
    message: 'Unsupported media format. Videos: MP4/WebM/MOV; photos: JPEG/WebP.',
    action: 'edit',
    retryable: false,
  },
  {
    code: 'frame_rate_check_failed',
    message: 'Unsupported video frame rate. TikTok allows 23-60 FPS.',
    action: 'edit',
    retryable: false,
  },
  {
    code: 'picture_size_check_failed',
    message: 'Unsupported picture size. Photos: max 1080px; videos: 360-4096px on both sides.',
    action: 'edit',
    retryable: false,
  },
  {
    code: 'invalid_param',
    message: 'TikTok rejected the post settings. Please review the post and try again.',
    action: 'edit',
    retryable: false,
  },
  {
    code: 'invalid_params',
    message: 'TikTok rejected the post settings. Please review the post and try again.',
    action: 'edit',
    retryable: false,
  },
  {
    code: 'privacy_level_option_mismatch',
    message: 'The selected privacy option is not available for this TikTok account. Please select another visibility option.',
    action: 'edit',
    retryable: false,
  },
  {
    code: 'spam_risk_text',
    message: 'TikTok determined the description text is risky or spammy and stopped the publish. Please edit the text.',
    action: 'edit',
    retryable: false,
  },
  {
    code: 'spam_risk',
    message: 'TikTok determined this publishing request is risky and stopped it. Please review the post.',
    action: 'edit',
    retryable: false,
  },
  {
    code: 'unaudited_client_can_only_post_to_private_accounts',
    message: "While Postmonster's TikTok integration is under review, posts can only go to private TikTok accounts. Please make this TikTok account private and try again.",
    action: 'edit',
    retryable: true,
  },
  {
    code: 'url_ownership_unverified',
    message: 'The media URL is not verified for TikTok. Please upload the media to Postmonster and try again.',
    action: 'edit',
    retryable: false,
  },
  {
    code: 'invalid_publish_id',
    message: 'TikTok does not know this publish request anymore. Please create a new post.',
    action: 'edit',
    retryable: false,
  },
  {
    code: 'publish_cancelled',
    message: 'This publish was cancelled. Please try again.',
    action: 'retry',
    retryable: true,
  },

  // --- Transient -> Retry ---
  {
    code: 'video_pull_failed',
    message: 'TikTok could not download the video from Postmonster. Please try again.',
    action: 'retry',
    retryable: true,
  },
  {
    code: 'photo_pull_failed',
    message: 'TikTok could not download the photos from Postmonster. Please try again.',
    action: 'retry',
    retryable: true,
  },
  {
    code: 'rate_limit_exceeded',
    message: 'TikTok API rate limit exceeded. Please try again in a few minutes.',
    action: 'retry',
    retryable: true,
  },
  {
    code: 'internal',
    message: 'A TikTok server error occurred. Please try again later.',
    action: 'retry',
    retryable: true,
  },
  {
    code: 'internal_error',
    message: 'A TikTok server error occurred. Please try again later.',
    action: 'retry',
    retryable: true,
  },
];

const BY_CODE = new Map(MAPPINGS.map((m) => [m.code, m]));

export function mapTikTokErrorCode(
  code: string | undefined | null
): TikTokErrorMapping | undefined {
  if (!code) return undefined;
  return BY_CODE.get(code);
}

// Scans a raw TikTok response body (or fail_reason string) for the first known
// code and returns its mapping. Longer/more specific codes are checked in the
// order they appear in the body.
export function mapTikTokErrorBody(
  body: string | undefined | null
): TikTokErrorMapping | undefined {
  if (!body) return undefined;
  for (const mapping of MAPPINGS) {
    if (body.indexOf(mapping.code) > -1) {
      return mapping;
    }
  }
  return undefined;
}

export function isTikTokCantPostCode(code: string | undefined | null): boolean {
  return !!code && TIKTOK_CANT_POST_CODES.indexOf(code) > -1;
}
