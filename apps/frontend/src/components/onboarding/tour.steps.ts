/**
 * Product-tour step list and English copy.
 *
 * Kept out of `tour.tsx` so Node tests can import it without loading the React
 * overlay. Calendar steps use `CALENDAR_STEP_PATH`; `tour.tsx` swaps that for
 * the live demo-week URL when the overlay runs.
 */

export interface StepMeta {
  key: string;
  /** Where the target lives. May carry a query — settings tabs are deep-linked. */
  path: string;
  /** Skips the ring and dims the whole screen — for a step about a whole page. */
  dim?: boolean;
  /**
   * Draw the ring on the target's own edge instead of padding outside it.
   *
   * The gap is right for a control sitting in a page — it separates the ring
   * from what is around the control. A surface that already has an edge of its
   * own does not want a second one floating beside it; the ring belongs on the
   * edge that is there.
   */
  flush?: boolean;
  /**
   * Something that has to be on screen for this step's target to exist.
   *
   * The panel a step describes can be collapsed — that preference lives in a
   * cookie for a year — and then the step explained a panel while pointing at
   * nothing. The component that owns the thing asks `useTourNeeds()` and
   * renders it open while the step is on screen.
   */
  needs?: 'posts-panel' | 'channel-add';
}

/** Sentinel path for calendar steps. Replaced at run time with the demo week. */
export const CALENDAR_STEP_PATH = '__calendar__';

/** Metadata only. `useSteps()` in `tour.tsx` adds the copy. */
export const STEPS: StepMeta[] = [
  // Always land on week calendar — a leftover `calendar-display=list` cookie
  // (or rail → Posts) would otherwise show the empty list and hide the demo.
  { key: 'cal-grid', path: CALENDAR_STEP_PATH, needs: 'posts-panel' },
  { key: 'posts-panel', path: CALENDAR_STEP_PATH, needs: 'posts-panel' },
  // Spotlight is the rail Connect button (still visible on /connections).
  { key: 'connect-pq', path: '/connections?nav=all' },
  // Desktop Connect fills the viewport, so a ring on the whole panel trips
  // `covers` and dims Featured. Spotlight the Featured row instead.
  { key: 'connect-featured', path: '/connections?nav=all' },
  { key: 'connect-creds', path: '/connections?nav=all' },
  // Spotlight is the rail Channels row; open Add Channel so the right pane
  // matches what the step describes (owner: not calendar behind the tip).
  { key: 'nav-channels', path: '/channels', needs: 'channel-add' },
  // End on open Add Channel / platform grid (design chAdd:'connect').
  { key: 'platform-grid', path: '/channels', needs: 'channel-add' },
];

/** English fallbacks for tour copy. Tests read this so the Connect steps stay honest. */
export const TOUR_COPY: Record<string, { title: string; text: string }> = {
  'cal-grid': {
    title: 'One calendar for every account',
    text: 'Write, generate and schedule for 30+ platforms here, without ever opening a social app.',
  },
  'posts-panel': {
    title: 'Every post in one queue',
    text: 'Scheduled, drafts and published, always right here.',
  },
  'connect-pq': {
    title: 'Connect an assistant, not a channel',
    text: 'This opens Connect PostQueen. Claude, ChatGPT and Cursor live here. Instagram and X live under Channels, next.',
  },
  'connect-featured': {
    title: 'Pick the client you already use',
    text: 'Featured is the short list. Assistants, Agents, Chat, Automation and Build sit in the left rail. Open one card and follow its steps.',
  },
  'connect-creds': {
    title: 'One API key for every client',
    text: 'Reveal it here, then copy the MCP URL. The same key works for MCP, the CLI and the Public API. Get it later from Settings, API Keys.',
  },
  'nav-channels': {
    title: 'Your publishing accounts live here',
    text: 'Connect Instagram, X, LinkedIn and the rest once. That is a channel, not an assistant.',
  },
  'platform-grid': {
    title: 'Post everywhere at once',
    text: 'Write it once and it goes out to every channel you picked.',
  },
};
