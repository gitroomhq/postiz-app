export type PostsPanelWelcomeTab = 'scheduled' | 'draft' | 'published';

/**
 * Calendar Posts rail: never open on an empty tab when another inventory
 * has rows. Empty accounts stay on Scheduled (a first-run queue, not Posted).
 */
export function pickPostsPanelTab(has: {
  scheduled: boolean;
  draft: boolean;
  published: boolean;
}): PostsPanelWelcomeTab {
  if (has.scheduled) return 'scheduled';
  if (has.draft) return 'draft';
  if (has.published) return 'published';
  return 'scheduled';
}

/**
 * `/posts/list` is minified (`t` / `p`). Reading only `total` always looked
 * empty, so the rail never left Scheduled.
 */
export function postsListHasRows(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as {
    total?: unknown;
    t?: unknown;
    posts?: unknown;
    p?: unknown;
  };
  const total = Number(data.total ?? data.t);
  if (Number.isFinite(total) && total > 0) return true;
  const posts = data.posts ?? data.p;
  return Array.isArray(posts) && posts.length > 0;
}
