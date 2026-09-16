export const GETTING_STARTED_TOTAL = 3;

/**
 * Logos on the empty "Connect your channel" step. Same idea as Buffer's
 * sidebar strip: three or four network pictures plus a + that opens
 * `/channels`. These identifiers match `/icons/platforms/{id}.png`.
 */
export const GETTING_STARTED_CONNECT_ICONS = [
  'facebook',
  'instagram',
  'x',
  'youtube',
] as const;

export const gettingStartedDismissKey = (orgId: string) =>
  `pq-gs-dismissed:${orgId}`;

/**
 * First-run checklist for an organization.
 *
 * Publishing immediately (calendar "Post now", MCP, n8n) also completes the
 * schedule step. Someone who never queued a post should not be asked to fake
 * one. The published probe is the source of truth for "this went out through
 * PostQueen"; scheduled is "there is something in the queue, or already out".
 */
export function gettingStartedProgress(input: {
  hasChannel: boolean;
  hasScheduled: boolean;
  hasPublished: boolean;
}): {
  channel: boolean;
  scheduled: boolean;
  published: boolean;
  done: number;
  total: typeof GETTING_STARTED_TOTAL;
  complete: boolean;
} {
  const channel = !!input.hasChannel;
  const published = !!input.hasPublished;
  const scheduled = !!input.hasScheduled || published;
  const done = Number(channel) + Number(scheduled) + Number(published);
  return {
    channel,
    scheduled,
    published,
    done,
    total: GETTING_STARTED_TOTAL,
    complete: done === GETTING_STARTED_TOTAL,
  };
}

/**
 * Hide until every probe has landed, then hide for good only after a completed
 * checklist is dismissed. Incomplete work always comes back, even if they
 * dismissed an earlier all-set state (disconnecting the last channel, etc.).
 */
export function gettingStartedVisible(input: {
  ready: boolean;
  complete: boolean;
  dismissed: boolean;
}): boolean {
  return !!input.ready && !(input.complete && input.dismissed);
}
