/**
 * Feed photos are not a fixed box. Instagram and Facebook crop only outside
 * 4:5 (portrait) … 1.91:1 (landscape). A square file stays square. Stories
 * are 9:16. The old Instagram preview used a 585px-tall cover box, so a 1:1
 * graphic looked taller and tighter than the published post.
 */
export const FEED_PREVIEW_MIN_WH = 4 / 5;
export const FEED_PREVIEW_MAX_WH = 1.91;
export const STORY_PREVIEW_WH = 9 / 16;

export function clampPreviewAspect(
  width: number,
  height: number,
  minWH: number,
  maxWH: number
): number {
  if (!(width > 0) || !(height > 0)) {
    return 1;
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
