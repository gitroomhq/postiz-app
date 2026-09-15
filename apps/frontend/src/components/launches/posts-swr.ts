/**
 * Calendar and Posts list share SWR keys that start `/posts-`. Bound
 * `mutate()` on a hook whose key is currently `null` (list view disables the
 * calendar fetch, calendar view disables the list fetch unless the panel is
 * open) is a no-op — the other cache, including `keepPreviousData` from the
 * previous view, stays put. Match every posts key instead.
 */
export function isPostsSwrKey(key: unknown): key is string {
  return typeof key === 'string' && key.startsWith('/posts-');
}

export function dropPostGroupFromRows<
  T extends { group?: string; id?: string },
>(rows: T[] | undefined, groupId: string): T[] {
  if (!rows?.length) return rows ?? [];
  return rows.filter((p) => p.group !== groupId && p.id !== groupId);
}

/** Calendar cache is `{ posts, comments }`; list cache is `{ posts, total }`. */
export function dropPostGroupFromSwrData(
  current: unknown,
  groupId: string
): unknown {
  if (!groupId || !current || typeof current !== 'object') return current;
  const data = current as { posts?: { group?: string; id?: string }[]; total?: number };
  if (!Array.isArray(data.posts)) return current;
  const posts = dropPostGroupFromRows(data.posts, groupId);
  const removed = data.posts.length - posts.length;
  if (!removed) return current;
  return {
    ...data,
    posts,
    ...(typeof data.total === 'number'
      ? { total: Math.max(0, data.total - removed) }
      : {}),
  };
}
