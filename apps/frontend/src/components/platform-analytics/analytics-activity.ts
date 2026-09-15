/**
 * Channel analytics used to treat every empty series as a broken connection.
 * A quiet week and a revoked token are not the same: only a non-zero point
 * counts as activity for the selected range.
 */
export function analyticsHasActivity(
  rows: Array<{ data?: Array<{ total: number | string }> }>,
): boolean {
  return rows.some((item) =>
    (item.data || []).some((point) => Number(point.total) !== 0),
  );
}

/**
 * `customFetch` resolves 4xx, so SWR `data` can be `{ message, statusCode }`
 * instead of an array. Only the reconnect copy from `checkAnalytics` should
 * flip the pane to Refresh Channel. A posting-era `refreshNeeded` flag, a
 * 500, or a random error body is not a new login — that is an empty period.
 */
export function analyticsResponseNeedsRefresh(data: unknown): boolean {
  if (data == null || Array.isArray(data)) {
    return false;
  }
  if (typeof data !== 'object') {
    return false;
  }
  const message = String((data as { message?: unknown }).message || '');
  return /needs to be refreshed/i.test(message);
}

export function analyticsResponseIsFailure(
  responseOk: boolean,
  data: unknown,
): boolean {
  return !responseOk && !analyticsResponseNeedsRefresh(data);
}
