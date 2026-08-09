/**
 * Single source of truth for the Meta Graph API version used by every
 * Meta-family provider (Facebook, Instagram via Facebook Login, and
 * Instagram via Instagram Login / graph.instagram.com).
 *
 * Why this exists: the version used to be hardcoded per call site, which drifted
 * to four different versions at once (v20.0, v21.0, v22.0, v23.0) across
 * facebook.provider.ts, instagram.provider.ts and instagram.standalone.provider.ts.
 * Notably, Reels containers were created on v20.0 while the Audio API lookup ran
 * on v22.0.
 *
 * Why it matters: Meta expires a version roughly two years after release, and an
 * expired version is NOT rejected — calls are silently redirected to the nearest
 * live version. Failures therefore show up as behaviour changes, not as errors.
 * v20.0 expires 2026-09-24.
 *
 * Override at runtime with META_GRAPH_API_VERSION (e.g. 'v27.0') so an operator
 * can roll forward without rebuilding the image.
 *
 * Version table: https://developers.facebook.com/docs/graph-api/changelog
 */
export const META_GRAPH_API_VERSION =
  process.env.META_GRAPH_API_VERSION || 'v26.0';
