'use client';

import {
  FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import dayjs from 'dayjs';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { postsListHasRows } from '@gitroom/frontend/components/launches/posts-panel-tab';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { CrownGlyph } from '@gitroom/frontend/components/ui/logo.component';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useDateFormat } from '@gitroom/frontend/components/launches/helpers/date.format';
import {
  CALENDAR_STEP_PATH,
  STEPS,
  TOUR_COPY,
  type StepMeta,
} from './tour.steps';
import {
  TOUR_CARD_H,
  TOUR_MARGIN,
  clipSpotlight,
  isMobileTour,
  placeByBand,
  placeTourCard,
  tourCardWidth,
  tourIsHuge,
  type TourRect,
} from './tour.layout';

export { STEPS, TOUR_COPY, type StepMeta } from './tour.steps';

/**
 * The product tour. A fixed overlay that spotlights one `[data-tour="…"]`
 * element at a time and explains it.
 *
 * It never re-parents anything: targets sit inside scrollable columns, so the
 * overlay reads `getBoundingClientRect()` off the live element and paints
 * beside it. The only app state it drives is the route — it will navigate to
 * the page a step lives on. It opens no modals, and the one panel it needs
 * visible it asks for through `useTourNeeds()` without touching the stored
 * preference, so nothing it does outlives the tour.
 */

const RING_PAD = 8;

/** Dismissal is per organization in this browser, not a global UI preference. */
const STORAGE_KEY = 'pq-tour-seen';
const seenKey = (orgId: string) => `${STORAGE_KEY}:${orgId}`;
/**
 * "This account has a first run owing." Set the moment the server says so,
 * cleared when the tour actually opens.
 *
 * The signal and the overlay do not meet on their own. Registration answers
 * with an `onboarding` header, the app redirects to `/launches?tour=true`, and
 * on a billing deployment `/user/self` then reports FREE — which replaces the
 * entire app with the first-billing screen, so `Tour` never mounts and the
 * query param is read by nobody. The tour used to arrive only on the Stripe
 * *return* URL; a lifetime purchase, a manually granted tier or any other way
 * in got no first run at all. Writing the intent down survives all of that.
 */
const PENDING_KEY = 'pq-tour-pending';

/**
 * The week the demo runs on: the next one, always entirely ahead of now.
 *
 * The seeded posts sit on fixed weekday/hour slots, so on the current week
 * anyone signing up after Monday morning meets a calendar of hatched
 * "date passed" cells full of posts badged PUBLISHED — the opposite of the
 * "look what you have scheduled" the step is making. Next week's Monday is
 * always at least tomorrow, so every slot reads as scheduled, whatever day
 * somebody arrives on.
 *
 * `startDate` / `endDate` are the calendar's own range params, so this moves
 * the view and the seeded posts together — `demoWeekStart` in
 * `calendar.context` derives from the same range. Written with plain `day()`
 * arithmetic rather than `startOf('isoWeek')`: the isoWeek plugin is extended
 * onto dayjs by the calendar, and this module can load first.
 */
const demoWeekRange = () => {
  const next = dayjs().add(1, 'week');
  const monday = next.subtract((next.day() + 6) % 7, 'day');
  return `startDate=${monday.format('YYYY-MM-DD')}&endDate=${monday
    .add(6, 'day')
    .format('YYYY-MM-DD')}`;
};

/**
 * The two calendar steps share one route, demo week and all.
 *
 * Re-read on every run rather than baked in at module load: a tab left open
 * across a week boundary would otherwise seed the demo onto a week that has
 * since gone by, which is the exact thing the demo week exists to avoid.
 */
const calPath = () => `/launches?display=week&${demoWeekRange()}`;
const CAL_PATH = calPath();

interface TourStoreInterface {
  /** Starts at the first step, whether or not the tour was seen before. */
  start(): void;
  stop(): void;
}

/**
 * The card the calendar demo drags, while it is in the air.
 *
 * Lives in the store because the two halves of the beat sit in different
 * components: `useTourDemo()` (mounted by the calendar) drives the timeline and
 * measures the grid, `Tour` paints the ghost over it.
 */
interface Ghost {
  /** Viewport rect — the ghost is `position: fixed`, like the design's. */
  t: number;
  l: number;
  w: number;
  /** The slot it is heading for, so the drop target can be ringed. */
  target: Rect;
  fade?: boolean;
}

interface State extends TourStoreInterface {
  running: boolean;
  step: number;
  next(): void;
  ghost: Ghost | null;
  setGhost(next: Ghost | null): void;
  /** Calendar route for this run, demo week included. */
  calPath: string;
}

const useTourStore = create<State>((set) => ({
  running: false,
  step: 0,
  ghost: null,
  calPath: CAL_PATH,
  start: () =>
    set({ running: true, step: 0, ghost: null, calPath: calPath() }),
  stop: () => set({ running: false, step: 0, ghost: null }),
  next: () => set((state) => ({ step: state.step + 1, ghost: null })),
  setGhost: (ghost) => set({ ghost }),
}));

export const useTour = () =>
  useTourStore(
    useShallow((state) => ({ start: state.start, stop: state.stop }))
  );

/**
 * True while the tour's own scrim is on screen.
 *
 * Anything that dims the app for its own reasons has to stand down while this
 * is true: the tour already dims everything and then cuts a hole for the step's
 * target, and a second scrim under that hole darkens the one thing the step is
 * pointing at.
 */
export const useTourRunning = () => useTourStore((state) => state.running);

/** True when this browser has already been through the tour for this org. */
export const tourSeen = (orgId?: string) => {
  try {
    if (!orgId) return false;
    return localStorage.getItem(seenKey(orgId)) === '1';
  } catch (err) {
    // Safari in private mode throws on localStorage. Treat it as unseen; a
    // repeated tour is a smaller failure than a tour nobody can start.
    return false;
  }
};

const markSeen = (orgId?: string) => {
  try {
    if (orgId) localStorage.setItem(seenKey(orgId), '1');
    // Whatever was owing has now been shown, or deliberately dismissed.
    localStorage.removeItem(PENDING_KEY);
  } catch (err) {
    /* see tourSeen */
  }
};

/**
 * Record that the server has just told us this is a first run.
 *
 * Called from the fetch interceptor, which sees the `onboarding` header before
 * any redirect and long before `Tour` is on screen — see `PENDING_KEY`.
 */
export const markTourPending = () => {
  try {
    localStorage.setItem(PENDING_KEY, '1');
  } catch (err) {
    /* see tourSeen */
  }
};

const tourPending = () => {
  try {
    return localStorage.getItem(PENDING_KEY) === '1';
  } catch (err) {
    return false;
  }
};

const clearTourPending = () => {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch (err) {
    /* see tourSeen */
  }
};

/**
 * Whether this organization has ever published a post.
 *
 * Used to skip the tour's demo calendar once this organization has shipped a
 * real post. Help → Take a tour now keys off the Getting started checklist
 * instead, so a scheduled-only account still gets the walkthrough.
 *
 * Same probe the posts panel uses to pick its opening tab: `limit=1` asks the
 * server for "any?" rather than "how many?". Pass `enabled: false` to skip the
 * request. Undefined while in flight and when the request fails.
 *
 * The key carries the org because the answer does. The request is scoped by the
 * caller's cookie, so a bare path let a cached "yes" from a busy workspace
 * follow the person into a brand-new one and hide the row there.
 */
export const useHasPublishedPost = (enabled: boolean) => {
  const fetch = useFetch();
  const user = useUser();
  const { data } = useSWR(
    enabled
      ? `/posts/list?state=published&limit=1&page=0#${user?.orgId || ''}`
      : null,
    async (key: string) => {
      const data = await (await fetch(key.split('#')[0])).json();
      return postsListHasRows(data);
    },
    { revalidateOnFocus: false, revalidateIfStale: false }
  );

  return data;
};

interface Step extends StepMeta {
  title: string;
  text: string;
}

/**
 * Whether the running tour currently needs this thing visible.
 *
 * Read by whichever component owns it. Returns false whenever the tour is not
 * running, so outside the tour nothing behaves differently.
 */
export const useTourNeeds = (need: NonNullable<StepMeta['needs']>) =>
  useTourStore((state) => state.running && STEPS[state.step]?.needs === need);

/** Current tour step key while running; null otherwise. */
export const useTourStepKey = () =>
  useTourStore((state) =>
    state.running ? STEPS[state.step]?.key ?? null : null
  );

const useSteps = (): Step[] => {
  const t = useT();
  // The demo week as of this run, not as of whenever the bundle was evaluated.
  const cal = useTourStore((state) => state.calPath);
  return useMemo(() => {
    const copy: Record<string, { title: string; text: string }> = {
      'cal-grid': {
        title: t('tour_calendar_title', TOUR_COPY['cal-grid'].title),
        text: t('tour_calendar_text', TOUR_COPY['cal-grid'].text),
      },
      'posts-panel': {
        title: t('tour_views_title', TOUR_COPY['posts-panel'].title),
        text: t('tour_views_text', TOUR_COPY['posts-panel'].text),
      },
      'connect-pq': {
        title: t('tour_connect_title', TOUR_COPY['connect-pq'].title),
        text: t('tour_connect_text', TOUR_COPY['connect-pq'].text),
      },
      'connect-featured': {
        title: t('tour_featured_title', TOUR_COPY['connect-featured'].title),
        text: t('tour_featured_text', TOUR_COPY['connect-featured'].text),
      },
      'connect-creds': {
        title: t('tour_creds_title', TOUR_COPY['connect-creds'].title),
        text: t('tour_creds_text', TOUR_COPY['connect-creds'].text),
      },
      'nav-channels': {
        title: t('tour_channels_title', TOUR_COPY['nav-channels'].title),
        text: t('tour_channels_text', TOUR_COPY['nav-channels'].text),
      },
      'platform-grid': {
        title: t('tour_add_channel_title', TOUR_COPY['platform-grid'].title),
        text: t('tour_add_channel_text', TOUR_COPY['platform-grid'].text),
      },
    };
    return STEPS.map((step) => ({
      ...step,
      ...copy[step.key],
      path: step.path === CALENDAR_STEP_PATH ? cal : step.path,
    }));
  }, [t, cal]);
};

/**
 * The tour's demo calendar.
 *
 * Step one talks about the calendar, and on a new account the calendar is
 * empty, so there is nothing to point at. The design fills it with eight posts
 * that appear one at a time. They exist only while that step is on screen, are
 * never persisted, and are suppressed the moment the account has a real post —
 * writing fixtures over somebody's actual week would be indefensible.
 */
const DEMO_REVEAL_MS = 300;
/** After the eight land, the ninth waits, then is picked up — prototype 1100. */
const DEMO_DROP_MS = 1100;
/**
 * The reschedule beat, ported from the prototype's `runGhost()`.
 *
 * The card does not simply re-render into another cell: it is lifted out as a
 * fixed-position ghost that glides to the new slot and lands there. Without it
 * the post vanishes from one hour and reappears in another in the same frame,
 * which reads as a bug rather than as a drag.
 */
const DEMO_GHOST_LIFT_MS = 420;
const DEMO_GHOST_DROP_MS = 2000;
const DEMO_GHOST_CLEAR_MS = 2500;

/**
 * The reschedule: Wednesday 10:00 → 08:00. Two rows, like the design's Friday
 * 09:00 → 07:00, but in the middle of the week rather than at the edge of it,
 * and it lands in the empty 08:00 slot between the 07:00 and 09:00 posts
 * already sitting in that column — so the drop reads as slotting into a queue
 * instead of as a card moving through empty space. Friday is also the column
 * the step's own card used to sit over.
 *
 * Every other slot in this column is taken (see `DEMO_ROWS`), which is what
 * decides the hours: 07:00 and 09:00 are occupied, 08:00 and 10:00 are not.
 */
const DEMO_DRAG_DAY = 2;
const DEMO_DRAG_FROM = 10;
const DEMO_DRAG_TO = 8;
/** Stable handle on the dragged card, so the ghost can measure it. */
const DEMO_DRAG_ID = 'pq-tour-demo-drag';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Avatar for every tour demo channel (owner photo). */
export const TOUR_DEMO_PICTURE = '/onboarding/gokhan.png';

/**
 * Channel display name per provider — matches the design’s CHANNELS handles
 * (Gökhan KINAY / @thegokhankinay), not the post title.
 */
const demoChannelName = (provider: string): string => {
  switch (provider) {
    case 'linkedin':
    case 'youtube':
    case 'facebook':
      return 'Gökhan KINAY';
    case 'instagram':
      return 'thegokhankinay';
    default:
      // x, bluesky, mastodon, discord, and the drag card
      return '@thegokhankinay';
  }
};

/** [day of the visible week, hour, provider icon, title key, body key] */
const DEMO_ROWS: Array<[number, number, string, string, string]> = [
  [0, 7, 'x', 'tour_demo_1_title', 'tour_demo_1_body'],
  [0, 9, 'discord', 'tour_demo_2_title', 'tour_demo_2_body'],
  [1, 8, 'bluesky', 'tour_demo_3_title', 'tour_demo_3_body'],
  [1, 9, 'linkedin', 'tour_demo_4_title', 'tour_demo_4_body'],
  [2, 7, 'instagram', 'tour_demo_5_title', 'tour_demo_5_body'],
  [2, 9, 'youtube', 'tour_demo_6_title', 'tour_demo_6_body'],
  [3, 7, 'mastodon', 'tour_demo_7_title', 'tour_demo_7_body'],
  [3, 8, 'facebook', 'tour_demo_8_title', 'tour_demo_8_body'],
];

export interface TourDemoPost {
  /** Synthetic post id — also the handle the drag ghost measures. */
  id: string;
  day: number;
  hour: number;
  provider: string;
  /** Channel / account label on the calendar card. */
  channelName: string;
  title: string;
  body: string;
}

/**
 * Demo posts while the tour runs on an empty account. Stagger on the calendar
 * step; once past it (or on posts-panel), show the full set so the queue fills
 * like the design (`full = tourKey !== 'cal-grid'`).
 */
export const useTourDemo = (ready = true): TourDemoPost[] => {
  const t = useT();
  const { running, step } = useTourStore(
    useShallow((state) => ({ running: state.running, step: state.step }))
  );
  const showDemo = running;
  /**
   * `ready` is "the calendar grid is on screen", not "the tour started". All
   * three beats below reach into `[data-tour="cal-grid"]`, and the launches page
   * now mounts this provider while `/integrations/list` is still in flight so
   * that the posts wave can start early — the grid does not exist yet. Without
   * the gate the scroll gives up after ~670ms of `requestAnimationFrame` and
   * never retries, the 8×300ms reveal plays out behind the skeleton, and the
   * reschedule drag finds no nodes and silently skips.
   */
  const stagger = ready && running && step === 0;
  const setGhost = useTourStore((state) => state.setGhost);
  const [revealed, setRevealed] = useState(0);
  const [dropped, setDropped] = useState(false);
  /** The card is out of the grid and in the ghost's hands. */
  const [flying, setFlying] = useState(false);

  // The reschedule beat. Ported from the prototype's `runGhost()`: lift the
  // card out as a fixed ghost, glide it to the new slot, then let the real
  // card reappear there as the ghost fades.
  useEffect(() => {
    if (!stagger || revealed < DEMO_ROWS.length) {
      // Past the calendar step the design shows the post already rescheduled.
      if (!stagger) setDropped(true);
      return;
    }
    if (prefersReducedMotion()) {
      setDropped(true);
      return;
    }

    const timers: number[] = [];
    const land = () => {
      setFlying(false);
      setDropped(true);
    };

    timers.push(
      window.setTimeout(() => {
        const grid = document.querySelector('[data-tour="cal-grid"]');
        const src = grid?.querySelector(`[data-post-id="${DEMO_DRAG_ID}"]`);
        const from = src?.closest('[data-cell]') as HTMLElement | null;
        // Cells are keyed `YYYY-MM-DDTHH`; the beat stays inside its own day,
        // so the destination is that date at the target hour.
        const slot = from?.getAttribute('data-cal-slot');
        const to = slot
          ? (grid?.querySelector(
              `[data-cal-slot="${slot.slice(0, 11)}${String(
                DEMO_DRAG_TO
              ).padStart(2, '0')}"]`
            ) as HTMLElement | null)
          : null;
        // Nothing to measure (narrow week scrolled sideways, list view): land
        // the post rather than leave the beat half-played.
        if (!src || !to) {
          land();
          return;
        }
        const a = src.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const target = { t: b.top, l: b.left, w: b.width, h: b.height };
        // The 6px is the cell's own padding — the design drops the ghost where
        // the card will actually sit, not on the cell's corner.
        const rest = { t: target.t + 6, l: target.l + 6, w: a.width, target };
        setFlying(true);
        setGhost({ t: a.top, l: a.left, w: a.width, target });
        timers.push(
          window.setTimeout(() => setGhost(rest), DEMO_GHOST_LIFT_MS)
        );
        timers.push(
          window.setTimeout(() => {
            land();
            setGhost({ ...rest, fade: true });
          }, DEMO_GHOST_DROP_MS)
        );
        timers.push(
          window.setTimeout(() => setGhost(null), DEMO_GHOST_CLEAR_MS)
        );
      }, DEMO_DROP_MS)
    );

    return () => {
      timers.forEach(window.clearTimeout);
      setFlying(false);
      setGhost(null);
    };
  }, [stagger, revealed, setGhost]);

  useEffect(() => {
    if (!showDemo) {
      setRevealed(0);
      setDropped(false);
      return;
    }
    // Past calendar step: full queue immediately (posts-panel and later).
    if (!stagger) {
      setRevealed(DEMO_ROWS.length);
      setDropped(true);
      return;
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setRevealed(DEMO_ROWS.length);
      return;
    }
    setRevealed(0);
    const id = window.setInterval(() => {
      setRevealed((n) => {
        if (n >= DEMO_ROWS.length) {
          window.clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, DEMO_REVEAL_MS);
    return () => window.clearInterval(id);
  }, [showDemo, stagger]);

  useEffect(() => {
    if (!stagger) return;
    let tries = 0;
    const settle = () => {
      const grid = document.querySelector('[data-tour="cal-grid"]');
      const cell = grid?.querySelector('[data-cell]') as HTMLElement | null;
      if (grid && cell?.offsetHeight) {
        const cellH = cell.offsetHeight;
        const hours = [...DEMO_ROWS.map(([, hour]) => hour), DEMO_DRAG_FROM];
        const firstHour = Math.min(...hours, DEMO_DRAG_TO);
        const rows = Math.max(...hours) + 1 - firstHour;
        // Rows begin under the sticky day header.
        const head = grid.querySelector(
          '[data-cal-sticky-head]'
        ) as HTMLElement | null;
        const headH = head?.offsetHeight || 0;
        // One empty hour above the band reads better than starting flush under
        // the header — given up when the grid is too short to show the whole
        // band with it, because a cut-off last row costs more than the air.
        const air =
          headH + (rows + 1) * cellH <= grid.getBoundingClientRect().height
            ? 1
            : 0;
        grid.scrollTop = Math.max(0, (firstHour - air) * cellH);
        return;
      }
      if (tries++ < 40) requestAnimationFrame(settle);
    };
    settle();
  }, [stagger]);

  return useMemo(() => {
    if (!showDemo) return [];
    const copy: Record<string, string> = {
      tour_demo_1_title: t('tour_demo_1_title', 'Launch teaser'),
      tour_demo_1_body: t(
        'tour_demo_1_body',
        'The story behind the rebuild, in five frames.'
      ),
      tour_demo_2_title: t('tour_demo_2_title', 'Community update'),
      tour_demo_2_body: t(
        'tour_demo_2_body',
        'Everything shipped for the community this week.'
      ),
      tour_demo_3_title: t('tour_demo_3_title', 'Weekly build thread'),
      tour_demo_3_body: t(
        'tour_demo_3_body',
        'Every change that landed this week, in one thread.'
      ),
      tour_demo_4_title: t('tour_demo_4_title', 'Weekend recap'),
      tour_demo_4_body: t(
        'tour_demo_4_body',
        'Three things we learned shipping on a real calendar.'
      ),
      tour_demo_5_title: t('tour_demo_5_title', 'Case study: Meridian'),
      tour_demo_5_body: t(
        'tour_demo_5_body',
        'Meridian cut publishing time by 62% with one calendar.'
      ),
      tour_demo_6_title: t('tour_demo_6_title', 'Sixty second demo'),
      tour_demo_6_body: t(
        'tour_demo_6_body',
        'A minute with the new scheduler — write once, post everywhere.'
      ),
      tour_demo_7_title: t('tour_demo_7_title', 'AMA announcement'),
      tour_demo_7_body: t(
        'tour_demo_7_body',
        'Ask anything about scheduling at scale.'
      ),
      tour_demo_8_title: t('tour_demo_8_title', 'Team spotlight'),
      tour_demo_8_body: t(
        'tour_demo_8_body',
        'Meet the people behind the calendar.'
      ),
    };
    const shown = DEMO_ROWS.slice(0, revealed).map(
      ([day, hour, provider, titleKey, bodyKey], index) => ({
        id: `pq-tour-demo-${index}`,
        day,
        hour,
        provider,
        channelName: demoChannelName(provider),
        title: copy[titleKey],
        body: copy[bodyKey],
      })
    );
    // Ninth card: appears after the eight, then moves to an earlier hour — the
    // design's drag-to-reschedule beat (day 4, 09:00 → 07:00). While the ghost
    // carries it there the card leaves the grid, which is this codebase's
    // version of the prototype holding the source card at `opacity: 0`.
    if (revealed >= DEMO_ROWS.length && !flying) {
      shown.push({
        id: DEMO_DRAG_ID,
        day: DEMO_DRAG_DAY,
        hour: dropped ? DEMO_DRAG_TO : DEMO_DRAG_FROM,
        provider: 'x',
        channelName: demoChannelName('x'),
        title: t('tour_demo_drag_title', 'Feature drop'),
        body: t(
          'tour_demo_drag_body',
          'Drag to reschedule — no reload, and a calendar that keeps up.'
        ),
      });
    }
    return shown;
  }, [showDemo, revealed, dropped, flying, t]);
};

type Rect = TourRect;

/** Slot key of a demo cell, from the week the grid is currently showing. */
const demoSlot = (monday: string, day: number, hour: number) =>
  `${dayjs(monday).add(day, 'day').format('YYYY-MM-DD')}T${String(
    hour
  ).padStart(2, '0')}`;

/**
 * The block of the week the seeded posts occupy, in viewport coordinates.
 *
 * Read off the cells rather than the cards: cells are there from the first
 * frame and never move, so the step's card can be positioned against the block
 * once instead of sliding around as the eight posts arrive one at a time.
 */
const demoBandRect = (grid: Element): Rect | null => {
  const monday = grid
    .querySelector('[data-cell]')
    ?.getAttribute('data-cal-slot')
    ?.slice(0, 10);
  if (!monday) return null;
  const days = [...DEMO_ROWS.map(([day]) => day), DEMO_DRAG_DAY];
  const hours = [
    ...DEMO_ROWS.map(([, hour]) => hour),
    DEMO_DRAG_FROM,
    DEMO_DRAG_TO,
  ];
  const first = grid.querySelector(
    `[data-cal-slot="${demoSlot(monday, Math.min(...days), Math.min(...hours))}"]`
  );
  const last = grid.querySelector(
    `[data-cal-slot="${demoSlot(monday, Math.max(...days), Math.max(...hours))}"]`
  );
  if (!first || !last) return null;
  const a = first.getBoundingClientRect();
  const b = last.getBoundingClientRect();
  return { t: a.top, l: a.left, w: b.right - a.left, h: b.bottom - a.top };
};

/**
 * The demo card while it is being dragged.
 *
 * A fixed-position clone rather than the real card, for the same reason the
 * prototype uses one: the card lives inside a grid cell it cannot leave, and
 * driving the calendar's react-dnd layer with a fixture could leave the real
 * drag half-started. Geometry, easing and the pointer are the design's
 * (`runGhost`, prototype); the copy and the clock format are this repo's.
 */
const TourDragGhost: FC<{ ghost: Ghost }> = ({ ghost }) => {
  const t = useT();
  const { timePattern } = useDateFormat();
  const landsAt = dayjs()
    .hour(DEMO_DRAG_TO)
    .minute(0)
    .format(timePattern());

  return (
    <>
      {/* The slot it is heading for, ringed the way the calendar rings a real
          drop target (`canDrop`), so the move reads as a drop and not as a
          card wandering off. */}
      <div
        aria-hidden="true"
        data-tour-drop="1"
        // Square, like the week cell under it — the calendar's own `canDrop`
        // ring is drawn on an unrounded cell.
        className="pointer-events-none absolute shadow-[inset_0_0_0_2px_var(--brand)] transition-opacity duration-300"
        style={{
          top: ghost.target.t,
          left: ghost.target.l,
          width: ghost.target.w,
          height: ghost.target.h,
          opacity: ghost.fade ? 0 : 1,
        }}
      />
      <div
        aria-hidden="true"
        data-tour-ghost="1"
        className="pointer-events-none fixed box-border flex flex-col gap-[5px] rounded-[10px] bg-pqPop p-[6px_8px] shadow-pqTourGhost"
        style={{
          top: ghost.t,
          left: ghost.l,
          width: ghost.w,
          opacity: ghost.fade ? 0 : 1,
          transform: 'rotate(-2deg) scale(1.03)',
          // The 1.35s glide is the whole point of the beat — it is what makes
          // the post look carried rather than teleported.
          transition:
            'top 1.35s cubic-bezier(.33,.9,.35,1), left 1.35s cubic-bezier(.33,.9,.35,1), opacity .4s ease',
        }}
      >
        <div className="flex items-center gap-[6px]">
          <span className="grid h-[16px] w-[16px] place-items-center rounded-[5px] bg-pqBrand">
            <CrownGlyph className="h-[11px] w-[11px] text-pqOnBrand" />
          </span>
          <span className="text-[10.5px] font-[600] text-pqSoft">
            {landsAt}
          </span>
        </div>
        <div className="truncate text-[11.5px] leading-[1.35] text-pqText">
          {t(
            'tour_demo_drag_body',
            'Drag to reschedule — no reload, and a calendar that keeps up.'
          )}
        </div>
        {/* The pointer doing the dragging. Physical right/bottom rather than
            logical end/bottom: a cursor arrow points the same way in RTL. */}
        <span className="absolute bottom-[-8px] right-[-6px] h-[18px] w-[18px]">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            className="block text-pqOnBrand drop-shadow-pqCursor"
          >
            <path d="M5 3l14 8.5-6.2 1.4L9.6 19 5 3Z" fill="currentColor" />
          </svg>
        </span>
      </div>
    </>
  );
};

export const Tour: FC = () => {
  const t = useT();
  const user = useUser();
  const orgId = user?.orgId || '';
  const router = useRouter();
  const pathname = usePathname();
  const steps = useSteps();
  const { running, step, next } = useTourStore(
    useShallow((state) => ({
      running: state.running,
      step: state.step,
      next: state.next,
    }))
  );
  const ghost = useTourStore((state) => state.ghost);
  const { stop } = useTour();
  const query = useSearchParams();
  const [rect, setRect] = useState<Rect | null>(null);
  /**
   * Whether this run has ever had something to point at.
   *
   * The first step is reached while `/launches` is still showing its skeleton —
   * the calendar waits on `/integrations/list` — and until the grid exists the
   * overlay has no rect, which renders as a flat dim with the card floating in
   * the middle of it. That is the first thing a new account sees. Hold the
   * opening frame until there is a target, and give up waiting after a beat so
   * a step whose target genuinely never arrives still gets shown.
   */
  const [opened, setOpened] = useState(false);
  /** The block the calendar demo fills, so step one's card sits next to it. */
  const [band, setBand] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<Element | null>(null);
  const urlStarted = useRef(false);
  /** The step whose target has already been scrolled to, so it happens once. */
  const scrolled = useRef('');

  const current = running ? steps[Math.min(step, steps.length - 1)] : null;
  const last = step >= steps.length - 1;

  const stripTourQuery = useCallback(
    // `withRange` after a tour that ran: the calendar steps park the view on
    // next week for the demo, and leaving that behind hands somebody a calendar
    // opened on a week they never asked for. Not on the "already seen this"
    // path — there the range in the URL is the person's own.
    (withRange = false) => {
      const params = new URLSearchParams(query.toString());
      const owned = withRange
        ? ['tour', 'onboarding', 'startDate', 'endDate']
        : ['tour', 'onboarding'];
      if (!owned.some((key) => params.has(key))) return;
      owned.forEach((key) => params.delete(key));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [query, pathname, router]
  );

  const finish = useCallback(
    (opts?: { leaveOnAddChannel?: boolean }) => {
      markSeen(orgId);
      // Finish on the last step leaves Add Channel open (design). Esc still
      // dismisses without forcing that route.
      if (opts?.leaveOnAddChannel) {
        router.push('/channels?add=1');
      } else {
        // Sticky `?tour=` / `?onboarding=` would restart the overlay on refresh.
        stripTourQuery(true);
      }
      stop();
      setRect(null);
      setBand(null);
    },
    [orgId, router, stop, stripTourQuery]
  );

  // First-run and Help both land here. `?onboarding=` is kept as an alias so
  // auth redirects and OAuth return URLs keep working after the old modal died.
  // Soft entry only: if this organization already finished the tour in this
  // browser, leave the URL alone as a no-op (Help → Setup tour still calls
  // `start()` directly). A second workspace in the same browser still gets
  // its own first run — seen is per org, not global.
  const { start } = useTourStore(
    useShallow((state) => ({ start: state.start }))
  );
  useEffect(() => {
    if (urlStarted.current) return;
    // `?onboarding=` is also what the OAuth channel-connect return carries
    // (`continue.integration.tsx`), and that lands on `/channels?added=…`.
    // Somebody who has just connected their first channel is being shown a
    // result, not asking to be walked through the app from step one.
    if (query.get('added')) return;
    const asked =
      !!query.get('tour') || !!query.get('onboarding') || tourPending();
    if (!asked) return;
    // User context is still loading. Do not latch urlStarted or we will
    // swallow the first run, and do not consult a missing org id as "seen".
    if (!orgId) return;

    urlStarted.current = true;
    if (tourSeen(orgId)) {
      clearTourPending();
      stripTourQuery();
      return;
    }
    // The intent has been honoured; do not honour it twice.
    clearTourPending();
    // Existing sessions may still be on list view; force the calendar the
    // tour talks about before the overlay measures.
    if (pathname === '/launches' && query.get('display') !== 'week') {
      const params = new URLSearchParams(query.toString());
      params.set('display', 'week');
      params.delete('listRange');
      router.replace(`/launches?${params.toString()}`);
    }
    start();
  }, [orgId, query, start, stripTourQuery, pathname, router]);

  // A step's path may carry a query — the settings tabs are deep-linked — so
  // "are we there yet" has to compare the params too, not just the pathname.
  const onStepPage = useCallback(
    (s: Step) => {
      const [path, search] = s.path.split('?');
      if (pathname !== path) return false;
      if (!search) return true;
      return Array.from(new URLSearchParams(search).entries()).every(
        ([k, v]) => query.get(k) === v
      );
    },
    [pathname, query]
  );

  // Each step declares the page it lives on; get there before measuring.
  useEffect(() => {
    if (!current || onStepPage(current)) return;
    setRect(null);
    router.push(current.path);
  }, [current, onStepPage, router]);

  // Track the target. The prototype polls every 240ms; a ResizeObserver plus a
  // rAF pass on scroll/resize keeps the ring on the element without a timer,
  // and stops entirely when the tour is closed.
  useLayoutEffect(() => {
    if (!current || !onStepPage(current)) return;

    let frame = 0;
    let observer: ResizeObserver | null = null;
    let observed: Element | null = null;

    const read = () => {
      frame = 0;
      const el = document.querySelector(`[data-tour="${current.key}"]`);
      if (!el) {
        setRect((prev) => (prev === null ? prev : null));
        return;
      }
      if (el !== observed) {
        observer?.disconnect();
        observed = el;
        observer = new ResizeObserver(schedule);
        observer.observe(el);
      }
      // Scroll on the first sighting, not in a separate effect: right after a
      // navigation the element does not exist yet, and a one-shot effect that
      // fires then never scrolls at all.
      //
      // `block: 'center'` on a tall Add Channel grid scrolls the page to the
      // bottom so the grid's midpoint is in view — owner: keep the finish card
      // up top. Use 'start' for that step; 'center' for compact targets.
      if (scrolled.current !== current.key) {
        scrolled.current = current.key;
        if (
          current.key === 'platform-grid' ||
          current.key === 'connect-featured' ||
          current.key === 'connect-creds'
        ) {
          const pane =
            (el.closest('[data-tour="channels-page"]') as HTMLElement | null) ||
            (el.closest('.overflow-auto') as HTMLElement | null);
          if (pane && typeof pane.scrollTop === 'number') {
            pane.scrollTop = 0;
          }
          el.scrollIntoView({ block: 'start', inline: 'nearest' });
        } else {
          el.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
      }
      const nextBand =
        current.key === 'cal-grid' ? demoBandRect(el) : null;
      setBand((prev) =>
        prev &&
        nextBand &&
        Math.abs(prev.t - nextBand.t) < 1 &&
        Math.abs(prev.l - nextBand.l) < 1
          ? prev
          : nextBand
      );
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      // Follow the target's own corner rather than assuming one: a ring with a
      // 10px radius drawn around a 16px-radius panel cuts across all four of
      // its corners, which is what reads as the outline being off.
      const radius = parseFloat(
        getComputedStyle(el).borderTopLeftRadius || '0'
      );
      setRect((prev) =>
        prev &&
        Math.abs(prev.t - b.top) < 1 &&
        Math.abs(prev.l - b.left) < 1 &&
        Math.abs(prev.w - b.width) < 1 &&
        Math.abs(prev.h - b.height) < 1 &&
        prev.radius === radius
          ? prev
          : {
              t: b.top,
              l: b.left,
              w: b.width,
              h: b.height,
              radius: Number.isFinite(radius) ? radius : 0,
            }
      );
    };

    function schedule() {
      if (!frame) frame = requestAnimationFrame(read);
    }

    // The target may not be mounted yet on a fresh navigation, and it moves
    // while the page settles — so re-read until it stops changing.
    const settle = window.setInterval(schedule, 250);
    schedule();
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);

    return () => {
      window.clearInterval(settle);
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [current, onStepPage]);

  // Design hides Skip (`tourSkipDisplay: 'none'`) so people walk the tour.
  // Esc remains an accessibility escape that marks the tour seen.
  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, finish]);

  // Scrim does not dismiss — accidental clicks must not skip the tutorial.

  useEffect(() => {
    if (!running) {
      (restoreFocus.current as HTMLElement | null)?.focus?.();
      restoreFocus.current = null;
      return;
    }
    restoreFocus.current = document.activeElement;
  }, [running]);

  // Focus lands on the card so Tab reaches Next/Finish and screen readers hear
  // the step when it changes.
  // `opened` is in here because the card is not in the tree until it flips —
  // without it the opening step is drawn but never focused.
  useEffect(() => {
    if (!running) return;
    cardRef.current?.focus();
  }, [running, step, opened]);

  // A fresh run is a fresh run. Without this, re-running from Help leaves
  // `scrolled` holding the first step's key, so step one never scrolls its
  // target back into view, and `urlStarted` stays latched, so a second
  // `?tour=` later in the same session is ignored.
  useEffect(() => {
    if (running) {
      scrolled.current = '';
    } else {
      urlStarted.current = false;
      setOpened(false);
    }
  }, [running]);

  // Opening frame: as soon as there is a rect, or after a beat regardless.
  useEffect(() => {
    if (!running || opened) return;
    if (rect) {
      setOpened(true);
      return;
    }
    const id = window.setTimeout(() => setOpened(true), 1200);
    return () => window.clearTimeout(id);
  }, [running, opened, rect]);

  // Placement used a fixed 196px card. Long Featured copy on a phone is
  // taller than that, so Next sat under the home indicator. Measure the
  // live card and re-place; cap the height so a landscape phone still fits.
  const [cardH, setCardH] = useState(TOUR_CARD_H);
  useLayoutEffect(() => {
    if (!running || !opened) {
      setCardH(TOUR_CARD_H);
      return;
    }
    const el = cardRef.current;
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    if (!h) return;
    setCardH((prev) => (Math.abs(prev - h) < 1 ? prev : h));
  }, [running, opened, step, current?.key]);

  // The demo cards fade in one at a time rather than appearing fully formed.
  // Done in CSS off a root attribute — the same element and the same idiom as
  // `data-mobile` / `data-tablet` — because the cards are rendered by the
  // calendar, which knows nothing about the tour.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-tourdemo', running ? '1' : '0');
    const nodes = () =>
      document.querySelectorAll<HTMLElement>(
        '#chatbase-bubble-button, #chatbase-bubble-window, [id^="chatbase-bubble"], iframe[src*="chatbase"]'
      );
    const apply = () => {
      nodes().forEach((el) => {
        if (running) {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
        }
      });
    };
    apply();
    const id = window.setInterval(apply, 100);
    return () => {
      root.setAttribute('data-tourdemo', '0');
      window.clearInterval(id);
      nodes().forEach((el) => {
        el.style.removeProperty('display');
        el.style.removeProperty('visibility');
        el.style.removeProperty('pointer-events');
      });
    };
  }, [running]);

  if (!current || !opened) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = tourCardWidth(vw);
  const spotRect = rect
    ? clipSpotlight(rect, current.key, vw, vh)
    : null;
  const huge = tourIsHuge(spotRect, current.key, current.dim, vw, vh);
  const spot = !!spotRect && !huge;
  const pad = current.flush ? 0 : RING_PAD;
  const rtl =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('dir') === 'rtl';
  const pos = !spotRect
    ? null
    : (current.key === 'cal-grid' && band && !huge
        ? placeByBand(spotRect, band, rtl, vw, vh, cardH)
        : null) ||
      placeTourCard(spotRect, huge, current.key, vw, vh, rtl, cardH);
  // Caret only when the card sits beside the target (LTR: right; RTL: left).
  const showCaret =
    !!spot &&
    !!spotRect &&
    !!pos &&
    (rtl
      ? pos.l + cardW < spotRect.l
      : pos.l > spotRect.l + spotRect.w);

  return (
    <div
      className="fixed inset-0 z-[400]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pq-tour-title"
      // The tour is walked with Next, and nothing else ends it. Swallowing the
      // press in the capture phase is what makes that true rather than merely
      // intended: the overlay covers the screen, but the surfaces under it
      // include a Connections scrim whose whole job is to close on an outside
      // click, and one stray press there took the panel — and the step
      // standing on it — out from under the person mid-tour.
      onPointerDownCapture={(e) => {
        if ((e.target as HTMLElement).closest('[data-tour-action]')) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest('[data-tour-action]')) return;
        e.stopPropagation();
      }}
    >
      {/* The hole is cut with four rects rather than one giant `box-shadow` on
          the ring: `pqTick` animates box-shadow to make the ring pulse, and a
          CSS animation beats an inline style, so the two cannot share the
          property — the scrim silently loses. */}
      {!spot && (
        <div className="absolute inset-0 bg-pqTourScrim" aria-hidden="true" />
      )}

      {spot &&
        spotRect &&
        [
          {
            top: 0,
            left: 0,
            width: '100%',
            height: Math.max(0, spotRect.t - pad),
          },
          {
            top: spotRect.t + spotRect.h + pad,
            left: 0,
            width: '100%',
            bottom: 0,
          },
          {
            top: spotRect.t - pad,
            left: 0,
            width: Math.max(0, spotRect.l - pad),
            height: spotRect.h + pad * 2,
          },
          {
            top: spotRect.t - pad,
            left: spotRect.l + spotRect.w + pad,
            right: 0,
            height: spotRect.h + pad * 2,
          },
        ].map((style, i) => (
          <div
            key={i}
            className="absolute bg-pqTourScrim"
            style={style}
            aria-hidden="true"
          />
        ))}

      {spot && spotRect && (
        <div
          aria-hidden="true"
          data-tour-ring="1"
          className="pq-loop pointer-events-none absolute border border-pqBrand animate-pqTick"
          style={{
            top: spotRect.t - pad,
            left: spotRect.l - pad,
            width: spotRect.w + pad * 2,
            height: spotRect.h + pad * 2,
            // The target's corner, grown by however far out the ring sits. A
            // fixed radius traces a different shape than the thing under it.
            borderRadius: (spotRect.radius ?? 10) + pad,
          }}
        />
      )}

      {!!ghost && <TourDragGhost ghost={ghost} />}

      {/* The caret the design draws from the card back to what it is pointing
          at. Only when the card ended up beside the target — LTR to the right,
          RTL to the left — that is the case where the gap reads as ambiguous. */}
      {showCaret && spotRect && pos && (
        <div
          aria-hidden="true"
          data-tour-caret="1"
          className={clsx(
            // Brand hairline, not the neutral one: the tail continues the
            // card's own edge, and the card's edge is brand now.
            'pointer-events-none absolute h-[16px] w-[16px] rotate-45 border-b bg-pqPop',
            rtl ? 'border-e border-pqBrand' : 'border-s border-pqBrand'
          )}
          style={{
            left: rtl ? pos.l + cardW - 8 : pos.l - 8,
            top: Math.max(
              pos.t + 22,
              Math.min(pos.t + 136, spotRect.t + spotRect.h / 2 - 8)
            ),
          }}
        />
      )}

      <div
        ref={cardRef}
        tabIndex={-1}
        // The design's tour bubble: 20px padding, 16px corner, a brand hairline
        // and bloom instead of a neutral border, and a wash down from the top.
        // The wash is a background *image* over `bg-pqPop` — an alpha token set
        // as background-color would replace the surface instead of tinting it.
        className="absolute overflow-y-auto rounded-[16px] bg-pqPop p-[20px] shadow-pqTourCard outline-none animate-pqPop"
        style={{
          width: cardW,
          maxHeight: Math.max(120, vh - 2 * TOUR_MARGIN),
          backgroundImage:
            'linear-gradient(180deg, var(--tourCardWash), transparent 58%)',
          ...(pos
            ? { top: pos.t, left: pos.l }
            : {
                top: `calc(50% - ${TOUR_CARD_H / 2}px)`,
                left: `calc(50% - ${cardW / 2}px)`,
              }),
        }}
      >
        <div
          className="text-[11px] font-[600] uppercase tracking-[0.08em] text-pqBrand"
          aria-hidden="true"
        >
          {step + 1} / {steps.length}
        </div>
        {/* `text-balance` on the heading, `text-pretty` on the body: at 320px
            both were dropping a single word onto a line of its own ("use",
            "app.") and it read as a layout fault. The design already asks for
            `text-wrap: pretty` here; the heading gets `balance`, which is what
            that property is for. */}
        <div
          id="pq-tour-title"
          className="mt-[6px] font-display text-[17px] font-[600] -tracking-[0.015em] text-pqText text-balance"
        >
          {current.title}
        </div>
        <div className="mt-[8px] text-[13.5px] leading-[1.6] text-pqMuted text-pretty">
          {current.text}
        </div>

        <div className="mt-[16px] flex items-center gap-[10px]">
          <div
            className="flex flex-1 items-center gap-[5px]"
            aria-hidden="true"
          >
            {steps.map((s, i) => (
              <div
                key={s.key}
                className={clsx(
                  'h-[5px] rounded-[999px] transition-all',
                  i === step
                    ? 'w-[18px] bg-pqBrand'
                    : clsx(
                        'w-[5px]',
                        i < step ? 'bg-pqBrandSoft' : 'bg-pqBorder'
                      )
                )}
              />
            ))}
          </div>
          <button
            type="button"
            data-tour-action="next"
            onClick={() =>
              last ? finish({ leaveOnAddChannel: true }) : next()
            }
            className={clsx(
              'rounded-pqSm bg-pqBrand px-[14px] text-[13px] font-[500] text-pqOnBrand hover:bg-pqBrandHover',
              isMobileTour(vw)
                ? 'min-h-[44px] min-w-[44px] px-[16px]'
                : 'py-[6px]'
            )}
          >
            {last ? t('finish', 'Finish') : t('next', 'Next')}
          </button>
        </div>
      </div>
    </div>
  );
};
