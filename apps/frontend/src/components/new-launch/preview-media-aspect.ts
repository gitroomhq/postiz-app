/**
 * Composer Post Preview is the home-feed card, not the profile grid.
 *
 * Meta Graph API stills (and in-feed video that is not a Reel) must sit in
 * 4:5 … 1.91:1. Inside that window Instagram keeps the file's ratio: 4:5
 * stays 4:5, 3:4 is cropped to 4:5, 1:1 stays 1:1, 3:2 stays 3:2, 16:9 stays
 * 16:9, wider than 1.91:1 loses the sides. It does not force square and it
 * does not crop 3:2 down to 4:5.
 *
 * Recommended default is 4:5 (1080×1350), not 1:1. The 3:4 profile-grid
 * thumbnail is a different surface.
 *
 * https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/
 */
export const FEED_PREVIEW_MIN_WH = 4 / 5;
export const FEED_PREVIEW_MAX_WH = 1.91;
export const FEED_PREVIEW_FALLBACK_WH = 4 / 5;
export const STORY_PREVIEW_WH = 9 / 16;
/** Single mp4 posts publish as Reels; the home-feed card is 4:5, not 9:16. */
export const REEL_FEED_PREVIEW_WH = 4 / 5;

export function clampPreviewAspect(
  width: number,
  height: number,
  minWH: number,
  maxWH: number
): number {
  if (!(width > 0) || !(height > 0)) {
    return Number.NaN;
  }
  const ratio = width / height;
  return Math.min(maxWH, Math.max(minWH, ratio));
}

export function feedPreviewAspect(width: number, height: number): number {
  return clampPreviewAspect(
    width,
    height,
    FEED_PREVIEW_MIN_WH,
    FEED_PREVIEW_MAX_WH
  );
}

export function isPreviewVideo(path: string | undefined | null): boolean {
  return typeof path === 'string' && path.toLowerCase().includes('.mp4');
}

export function instagramFeedPreviewRange(opts: {
  isStory: boolean;
  paths: Array<string | undefined>;
}): { minWH: number; maxWH: number; fallbackWH: number } {
  if (opts.isStory) {
    return {
      minWH: STORY_PREVIEW_WH,
      maxWH: STORY_PREVIEW_WH,
      fallbackWH: STORY_PREVIEW_WH,
    };
  }
  if (opts.paths.length === 1 && isPreviewVideo(opts.paths[0])) {
    return {
      minWH: REEL_FEED_PREVIEW_WH,
      maxWH: REEL_FEED_PREVIEW_WH,
      fallbackWH: REEL_FEED_PREVIEW_WH,
    };
  }
  return {
    minWH: FEED_PREVIEW_MIN_WH,
    maxWH: FEED_PREVIEW_MAX_WH,
    fallbackWH: FEED_PREVIEW_FALLBACK_WH,
  };
}
