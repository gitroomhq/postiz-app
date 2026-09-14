/**
 * Two-step connect used to send one page (`{ page }`, `{ id }`, …). Save then
 * flipped `inBetweenSteps` off, so a second POST was "Invalid request".
 * Selecting several pages now arrives as `{ pages: [...] }` in the same body.
 *
 * `state` is the public-connect Redis key, not a provider field.
 */
const CONNECT_META_KEYS = new Set(['state', 'pages']);

export function providerPageSelections(
  data: unknown
): Record<string, unknown>[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return [];
  }

  const body = data as Record<string, unknown>;
  if (Array.isArray(body.pages) && body.pages.length > 0) {
    return body.pages.map((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return item as Record<string, unknown>;
      }
      return { page: item };
    });
  }

  const rest = Object.fromEntries(
    Object.entries(body).filter(([key]) => !CONNECT_META_KEYS.has(key))
  );
  return Object.keys(rest).length ? [rest] : [];
}
