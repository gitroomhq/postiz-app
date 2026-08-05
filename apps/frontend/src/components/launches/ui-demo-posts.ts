/**
 * Client-only fixture posts lifted from the design prototype's `posts()` seed
 * so an empty local calendar / Posts list can be judged against the handoff.
 *
 * Not persisted. Never sent to the API. Shown only when the account has no real
 * posts in the current fetch and UI demo mode is on (dev default, or `?uiDemo=1`).
 *
 * Day indices are offsets from the visible week start (Mon). Friday (day 4)
 * carries 5+ posts so calendar "See all N posts" can be exercised.
 */

export type UiDemoRow = {
  day: number;
  hour: number;
  provider: string;
  channel: string;
  body: string;
  method: 'WEB' | 'API' | 'MCP' | 'CLI' | 'AUTOPOST';
  state: 'QUEUE' | 'DRAFT' | 'PUBLISHED';
  tags: { name: string; color: string }[];
};

const LAUNCH = { name: 'Launch', color: 'var(--warn)' };
const PRODUCT = { name: 'Product', color: 'var(--brand)' };
const EVERGREEN = { name: 'Evergreen', color: 'var(--ok)' };

/** Design-faithful sample week (relative to current week start). */
export const UI_DEMO_ROWS: UiDemoRow[] = [
  // Monday
  {
    day: 0,
    hour: 9,
    provider: 'instagram',
    channel: 'thegokhankinay',
    body: 'v3.2 is live. Here is the story behind the rebuild.',
    method: 'WEB',
    state: 'QUEUE',
    tags: [LAUNCH, PRODUCT],
  },
  {
    day: 0,
    hour: 11,
    provider: 'reddit',
    channel: 'u/thegokhankinay',
    body: 'What we shipped this week for the community.',
    method: 'WEB',
    state: 'QUEUE',
    tags: [PRODUCT],
  },
  {
    day: 0,
    hour: 14,
    provider: 'linkedin',
    channel: 'Gökhan KINAY',
    body: 'How we shipped v3.2 in six weeks.',
    method: 'API',
    state: 'QUEUE',
    tags: [PRODUCT],
  },
  // Tuesday
  {
    day: 1,
    hour: 11,
    provider: 'x',
    channel: '@thegokhankinay',
    body: 'What shipped in v3.2 — a thread.',
    method: 'WEB',
    state: 'QUEUE',
    tags: [LAUNCH],
  },
  {
    day: 1,
    hour: 15,
    provider: 'instagram',
    channel: 'thegokhankinay',
    body: 'Inside our new design system.',
    method: 'CLI',
    state: 'QUEUE',
    tags: [],
  },
  {
    day: 1,
    hour: 17,
    provider: 'youtube',
    channel: 'Gökhan KINAY',
    body: 'Sixty seconds of the new scheduler.',
    method: 'MCP',
    state: 'QUEUE',
    tags: [],
  },
  // Wednesday — dense hour for See all
  {
    day: 2,
    hour: 10,
    provider: 'x',
    channel: '@thegokhankinay',
    body: 'v3.2 is live — drag to reschedule, no reload, and a calendar that finally keeps up.',
    method: 'WEB',
    state: 'QUEUE',
    tags: [LAUNCH],
  },
  {
    day: 2,
    hour: 10,
    provider: 'linkedin',
    channel: 'Gökhan KINAY',
    body: 'v3.2 is live — drag to reschedule, no reload, and a calendar that finally keeps up.',
    method: 'API',
    state: 'QUEUE',
    tags: [PRODUCT],
  },
  {
    day: 2,
    hour: 10,
    provider: 'facebook',
    channel: 'PostQueen',
    body: 'v3.2 is live — drag to reschedule, no reload, and a calendar that finally keeps up.',
    method: 'WEB',
    state: 'QUEUE',
    tags: [],
  },
  {
    day: 2,
    hour: 10,
    provider: 'instagram',
    channel: 'thegokhankinay',
    body: 'v3.2 is live — drag to reschedule, no reload, and a calendar that finally keeps up.',
    method: 'MCP',
    state: 'QUEUE',
    tags: [LAUNCH],
  },
  // Thursday
  {
    day: 3,
    hour: 9,
    provider: 'mastodon',
    channel: '@gokhan',
    body: 'Ask us anything about scheduling at scale.',
    method: 'WEB',
    state: 'QUEUE',
    tags: [],
  },
  {
    day: 3,
    hour: 15,
    provider: 'pinterest',
    channel: 'PostQueen',
    body: 'Saved to the Launch board — the full breakdown is on the blog.',
    method: 'WEB',
    state: 'PUBLISHED',
    tags: [LAUNCH],
  },
  // Friday — "See all 5 posts" (hour 15) + more for day list
  {
    day: 4,
    hour: 9,
    provider: 'youtube',
    channel: 'Gökhan KINAY',
    body: 'A walk through the room where v3.2 got built.',
    method: 'MCP',
    state: 'QUEUE',
    tags: [EVERGREEN],
  },
  {
    day: 4,
    hour: 14,
    provider: 'x',
    channel: '@thegokhankinay',
    body: 'Feature drop: drag to reschedule, no reload.',
    method: 'WEB',
    state: 'DRAFT',
    tags: [],
  },
  {
    day: 4,
    hour: 15,
    provider: 'instagram',
    channel: 'thegokhankinay',
    body: 'Saved to the Launch board — the full breakdown is on the blog.',
    method: 'WEB',
    state: 'QUEUE',
    tags: [LAUNCH],
  },
  {
    day: 4,
    hour: 15,
    provider: 'x',
    channel: '@thegokhankinay',
    body: 'Friday drop: the changelog nobody asked for but everybody reads.',
    method: 'WEB',
    state: 'QUEUE',
    tags: [PRODUCT],
  },
  {
    day: 4,
    hour: 15,
    provider: 'linkedin',
    channel: 'Gökhan KINAY',
    body: 'The long version, with the three decisions we almost got wrong.',
    method: 'API',
    state: 'QUEUE',
    tags: [PRODUCT],
  },
  {
    day: 4,
    hour: 15,
    provider: 'youtube',
    channel: 'Gökhan KINAY',
    body: 'Sixty seconds on why the scheduler got rewritten.',
    method: 'CLI',
    state: 'DRAFT',
    tags: [],
  },
  {
    day: 4,
    hour: 15,
    provider: 'facebook',
    channel: 'PostQueen',
    body: 'Small fixes shipped today.',
    method: 'WEB',
    state: 'QUEUE',
    tags: [],
  },
  {
    day: 4,
    hour: 18,
    provider: 'instagram',
    channel: 'thegokhankinay',
    body: 'We are hiring a senior product designer.',
    method: 'AUTOPOST',
    state: 'QUEUE',
    tags: [],
  },
];

export const UI_DEMO_STORAGE_KEY = 'pq-ui-demo';

/** Client-only seed / tour ids — never persisted, never sent to the API. */
export function isClientDemoPost(id: string) {
  return id.startsWith('pq-ui-demo-') || id.startsWith('pq-tour-demo-');
}

/** Dev-on by default; `?uiDemo=1` forces on, `?uiDemo=0` / storage `0` forces off. */
export function isUiDemoEnabled(searchParam: string | null): boolean {
  if (searchParam === '1') return true;
  if (searchParam === '0') return false;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(UI_DEMO_STORAGE_KEY);
      if (stored === '0') return false;
      if (stored === '1') return true;
    } catch {
      /* private mode */
    }
  }
  return process.env.NODE_ENV === 'development';
}
