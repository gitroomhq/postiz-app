/**
 * Channel analytics used to treat every empty series as a broken connection.
 * A quiet week and a revoked token are not the same: only a non-zero point
 * counts as activity for the selected range.
 */
export function analyticsHasActivity(
  rows: Array<{ data?: Array<{ total: number | string }> }>
): boolean {
  return rows.some((item) =>
    (item.data || []).some((point) => Number(point.total) !== 0)
  );
}
