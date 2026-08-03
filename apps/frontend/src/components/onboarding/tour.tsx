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
import { useT } from '@gitroom/react/translation/get.transation.service.client';

/**
 * The product tour. A fixed overlay that spotlights one `[data-tour="…"]`
 * element at a time and explains it.
 *
 * It never re-parents anything: targets sit inside scrollable columns, so the
 * overlay reads `getBoundingClientRect()` off the live element and paints
 * beside it. The only app state it drives is the route — it will navigate to
 * the page a step lives on, and nothing else. It does not open modals or
 * panels on the user's behalf.
 */

const CARD_W = 320;
const CARD_H = 176;
const MARGIN = 16;
const RING_PAD = 8;

/** Dismissal is per-browser. It is a UI preference, not account data. */
const STORAGE_KEY = 'pq-tour-seen';

interface TourStoreInterface {
  /** Starts at the first step, whether or not the tour was seen before. */
  start(): void;
  stop(): void;
}

interface State extends TourStoreInterface {
  running: boolean;
  step: number;
  next(): void;
}

const useTourStore = create<State>((set) => ({
  running: false,
  step: 0,
  start: () => set({ running: true, step: 0 }),
  stop: () => set({ running: false, step: 0 }),
  next: () => set((state) => ({ step: state.step + 1 })),
}));

export const useTour = () =>
  useTourStore(
    useShallow((state) => ({ start: state.start, stop: state.stop }))
  );

/** True when this browser has already been through the tour. */
export const tourSeen = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch (err) {
    // Safari in private mode throws on localStorage. Treat it as unseen; a
    // repeated tour is a smaller failure than a tour nobody can start.
    return false;
  }
};

const markSeen = () => {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch (err) {
    /* see tourSeen */
  }
};

interface Step {
  key: string;
  title: string;
  text: string;
  /** Where the target lives. May carry a query — settings tabs are deep-linked. */
  path: string;
  /** Skips the ring and dims the whole screen — for a step about a whole page. */
  dim?: boolean;
}

const useSteps = (): Step[] => {
  const t = useT();
  return useMemo(
    () => [
      {
        key: 'cal-grid',
        path: '/launches',
        /* prettier-ignore */ title: t('tour_calendar_title', 'One calendar for every account'),
        /* prettier-ignore */ text: t('tour_calendar_text', 'Write, generate and schedule for 30+ platforms here, without ever opening a social app.'),
      },
      {
        key: 'cal-views',
        path: '/launches',
        /* prettier-ignore */ title: t('tour_views_title', 'Every post in one queue'),
        /* prettier-ignore */ text: t('tour_views_text', 'Switch between day, week and month, or use List to see everything scheduled in one place.'),
      },
      {
        key: 'channels-column',
        path: '/launches',
        /* prettier-ignore */ title: t('tour_channels_title', 'Your accounts live here'),
        /* prettier-ignore */ text: t('tour_channels_text', 'Connect them once and set the hours each one publishes.'),
      },
      {
        key: 'add-channel',
        path: '/launches',
        /* prettier-ignore */ title: t('tour_add_channel_title', 'Post everywhere at once'),
        /* prettier-ignore */ text: t('tour_add_channel_text', 'Write it once and it goes out to every channel you picked.'),
      },
      {
        key: 'connect-pq',
        path: '/settings?tab=api',
        /* prettier-ignore */ title: t('tour_connect_title', 'Connect your AI to PostQueen'),
        /* prettier-ignore */ text: t('tour_connect_text', 'Claude, ChatGPT, Cursor, n8n or any AI agent can write, schedule and publish your posts through PostQueen.'),
      },
      {
        key: 'mcp-clients',
        path: '/settings?tab=api',
        dim: true,
        /* prettier-ignore */ title: t('tour_clients_title', 'Works with the tools you already use'),
        /* prettier-ignore */ text: t('tour_clients_text', 'Claude, ChatGPT, Cursor, Windsurf, Codex, n8n and every other MCP client.'),
      },
    ],
    [t]
  );
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
  day: number;
  hour: number;
  provider: string;
  title: string;
  body: string;
}

/**
 * The demo posts that are currently on screen, already translated. Empty
 * whenever the tour is not on its first step, which is what switches the whole
 * thing off.
 */
export const useTourDemo = (): TourDemoPost[] => {
  const t = useT();
  const { running, step } = useTourStore(
    useShallow((state) => ({ running: state.running, step: state.step }))
  );
  const onCalendarStep = running && step === 0;
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!onCalendarStep) {
      setRevealed(0);
      return;
    }
    // Everything at once for anyone who asked for less motion; the point is a
    // full calendar, the staggering is decoration.
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setRevealed(DEMO_ROWS.length);
      return;
    }
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
  }, [onCalendarStep]);

  // The demo sits at 07:00-09:00 and the grid opens at midnight, so without
  // this the posts appear below the fold and the step describes an empty
  // calendar. The design scrolls the same rows into view.
  useEffect(() => {
    if (!onCalendarStep) return;
    let tries = 0;
    const settle = () => {
      const grid = document.querySelector('[data-tour="cal-grid"]');
      const cell = grid?.querySelector('[data-cell]') as HTMLElement | null;
      if (grid && cell?.offsetHeight) {
        const firstHour = Math.min(...DEMO_ROWS.map(([, hour]) => hour));
        grid.scrollTop = Math.max(0, (firstHour - 1) * cell.offsetHeight);
        return;
      }
      if (tries++ < 40) requestAnimationFrame(settle);
    };
    settle();
  }, [onCalendarStep]);

  return useMemo(() => {
    if (!onCalendarStep) return [];
    /* prettier-ignore */
    const copy: Record<string, string> = {
      tour_demo_1_title: t('tour_demo_1_title', 'Launch teaser'),
      tour_demo_1_body: t('tour_demo_1_body', 'The story behind the rebuild, in five frames.'),
      tour_demo_2_title: t('tour_demo_2_title', 'Community update'),
      tour_demo_2_body: t('tour_demo_2_body', 'Everything the team shipped this week.'),
      tour_demo_3_title: t('tour_demo_3_title', 'Weekly build thread'),
      tour_demo_3_body: t('tour_demo_3_body', 'Every change that landed, in one thread.'),
      tour_demo_4_title: t('tour_demo_4_title', 'Weekend recap'),
      tour_demo_4_body: t('tour_demo_4_body', 'Three things the team learned this week.'),
      tour_demo_5_title: t('tour_demo_5_title', 'Customer story'),
      tour_demo_5_body: t('tour_demo_5_body', 'How one team plans a month in an afternoon.'),
      tour_demo_6_title: t('tour_demo_6_title', 'Sixty second demo'),
      tour_demo_6_body: t('tour_demo_6_body', 'A minute with the new scheduler.'),
      tour_demo_7_title: t('tour_demo_7_title', 'AMA announcement'),
      tour_demo_7_body: t('tour_demo_7_body', 'Ask the team anything about scheduling.'),
      tour_demo_8_title: t('tour_demo_8_title', 'Team spotlight'),
      tour_demo_8_body: t('tour_demo_8_body', 'Meet the two people behind the calendar.'),
    };
    return DEMO_ROWS.slice(0, revealed).map(
      ([day, hour, provider, titleKey, bodyKey]) => ({
        day,
        hour,
        provider,
        title: copy[titleKey],
        body: copy[bodyKey],
      })
    );
  }, [onCalendarStep, revealed, t]);
};

interface Rect {
  t: number;
  l: number;
  w: number;
  h: number;
}

/**
 * Where the card goes relative to the target. Ported from the prototype — the
 * order of the branches is what stops the card covering the thing it explains.
 */
const place = (r: Rect, huge: boolean, key: string) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let l: number;
  let t: number;

  if (huge) {
    l = r.l + r.w / 2 - CARD_W / 2;
    t = r.t + r.h / 2 - CARD_H / 2;
  } else if (r.w > 340 && r.h > 240) {
    if (key === 'cal-grid') {
      // The grid is mostly empty space, so the card can sit inside it — offset
      // off-centre so it covers a corner rather than the hours it describes.
      l = r.l + r.w * 0.54;
      t = r.t + r.h * 0.3 - CARD_H / 2;
    } else if (r.l + r.w + MARGIN + CARD_W <= vw - MARGIN) {
      l = r.l + r.w + MARGIN;
      t = r.t;
    } else if (r.t + r.h + MARGIN + CARD_H <= vh - MARGIN) {
      l = r.l;
      t = r.t + r.h + MARGIN;
    } else {
      // Nowhere to stand beside it. The prototype always lands here for a large
      // target, which puts the card on top of the content it is describing —
      // acceptable only when there is genuinely no room.
      l = r.l + r.w / 2 - CARD_W / 2;
      t = r.t + r.h / 2 - CARD_H / 2;
    }
  } else if (r.w < 340) {
    // Narrow target: card to the side, flipped when it would run off.
    l = r.l + r.w + MARGIN;
    t = r.h > 360 ? r.t + r.h / 2 - CARD_H / 2 : r.t + r.h / 2 - 62;
    if (l + CARD_W > vw - MARGIN) l = r.l - CARD_W - MARGIN;
  } else {
    // Wide target: card below, flipped above when it would run off.
    l = r.l;
    t = r.t + r.h + MARGIN;
    if (t + CARD_H > vh - MARGIN) t = r.t - CARD_H - MARGIN;
  }

  return {
    l: Math.min(Math.max(MARGIN, l), vw - CARD_W - MARGIN),
    t: Math.min(Math.max(MARGIN, t), vh - CARD_H - MARGIN),
  };
};

export const Tour: FC = () => {
  const t = useT();
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
  const { stop } = useTour();
  const query = useSearchParams();
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<Element | null>(null);
  const urlStarted = useRef(false);
  /** The step whose target has already been scrolled to, so it happens once. */
  const scrolled = useRef('');

  const current = running ? steps[Math.min(step, steps.length - 1)] : null;
  const last = step >= steps.length - 1;

  const finish = useCallback(() => {
    markSeen();
    stop();
    setRect(null);
  }, [stop]);

  // `?tour=true`, the same shape as the existing `?onboarding=true`. Support
  // can link someone straight into it. The ref keeps a finished tour from
  // restarting itself while the query is still on the URL.
  const { start } = useTourStore(useShallow((state) => ({ start: state.start })));
  useEffect(() => {
    if (!query.get('tour') || urlStarted.current) return;
    urlStarted.current = true;
    start();
  }, [query, start]);

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
      // fires then never scrolls at all. 'center', not 'nearest' — a tall
      // target left at the bottom of the fold leaves the card nowhere to
      // stand except on top of the thing it is describing.
      if (scrolled.current !== current.key) {
        scrolled.current = current.key;
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      setRect((prev) =>
        prev &&
        Math.abs(prev.t - b.top) < 1 &&
        Math.abs(prev.l - b.left) < 1 &&
        Math.abs(prev.w - b.width) < 1 &&
        Math.abs(prev.h - b.height) < 1
          ? prev
          : { t: b.top, l: b.left, w: b.width, h: b.height }
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

  // The design has no way out of the tour — `tourSkipDisplay` is computed and
  // hardcoded to 'none'. An overlay that traps the whole app with no exit is
  // not shippable, so Esc leaves and the card carries a real Skip.
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

  useEffect(() => {
    if (!running) {
      (restoreFocus.current as HTMLElement | null)?.focus?.();
      restoreFocus.current = null;
      return;
    }
    restoreFocus.current = document.activeElement;
  }, [running]);

  // Focus lands on the card so Tab cycles Skip → Next and screen readers hear
  // the step when it changes.
  useEffect(() => {
    if (!running) return;
    cardRef.current?.focus();
  }, [running, step]);

  if (!current) return null;

  const offscreen =
    !!rect &&
    (rect.w < 4 ||
      rect.h < 4 ||
      rect.l + rect.w < 8 ||
      rect.l > window.innerWidth - 8 ||
      rect.t > window.innerHeight - 8 ||
      rect.t + rect.h < 8);
  const covers =
    !!rect &&
    (rect.w * rect.h) / (window.innerWidth * window.innerHeight) > 0.82;
  const huge = !!rect && (offscreen || covers || !!current.dim);
  const spot = !!rect && !huge;
  const pos = rect ? place(rect, huge, current.key) : null;

  return (
    <div
      className="fixed inset-0 z-[400]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pq-tour-title"
    >
      {/* The hole is cut with four rects rather than one giant `box-shadow` on
          the ring: `pqTick` animates box-shadow to make the ring pulse, and a
          CSS animation beats an inline style, so the two cannot share the
          property — the scrim silently loses. */}
      {!spot && (
        <div className="absolute inset-0 bg-pqTourScrim" onClick={finish} />
      )}

      {spot &&
        rect &&
        [
          { top: 0, left: 0, width: '100%', height: Math.max(0, rect.t - RING_PAD) },
          {
            top: rect.t + rect.h + RING_PAD,
            left: 0,
            width: '100%',
            bottom: 0,
          },
          {
            top: rect.t - RING_PAD,
            left: 0,
            width: Math.max(0, rect.l - RING_PAD),
            height: rect.h + RING_PAD * 2,
          },
          {
            top: rect.t - RING_PAD,
            left: rect.l + rect.w + RING_PAD,
            right: 0,
            height: rect.h + RING_PAD * 2,
          },
        ].map((style, i) => (
          <div
            key={i}
            className="absolute bg-pqTourScrim"
            style={style}
            onClick={finish}
          />
        ))}

      {spot && rect && (
        <div
          aria-hidden="true"
          className="pq-loop pointer-events-none absolute rounded-pqMd border border-pqBrand animate-pqTick"
          style={{
            top: rect.t - RING_PAD,
            left: rect.l - RING_PAD,
            width: rect.w + RING_PAD * 2,
            height: rect.h + RING_PAD * 2,
          }}
        />
      )}

      <div
        ref={cardRef}
        tabIndex={-1}
        className="absolute w-[320px] rounded-pqLg border border-pqBorder bg-pqPop p-[18px] shadow-pqE3 outline-none animate-pqPop"
        style={
          pos
            ? { top: pos.t, left: pos.l }
            : { top: 'calc(50% - 88px)', left: 'calc(50% - 160px)' }
        }
      >
        <div
          className="text-[11px] font-[600] uppercase tracking-[0.08em] text-pqBrand"
          aria-hidden="true"
        >
          {step + 1} / {steps.length}
        </div>
        <div
          id="pq-tour-title"
          className="mt-[6px] text-[16px] font-[600] text-pqText"
        >
          {current.title}
        </div>
        <div className="mt-[6px] text-[13px] leading-[1.5] text-pqMuted">
          {current.text}
        </div>

        <div className="mt-[16px] flex items-center gap-[10px]">
          <div className="flex flex-1 items-center gap-[5px]" aria-hidden="true">
            {steps.map((s, i) => (
              <div
                key={s.key}
                className={clsx(
                  'h-[5px] rounded-[999px] transition-all',
                  i === step
                    ? 'w-[18px] bg-pqBrand'
                    : clsx('w-[5px]', i < step ? 'bg-pqBrandSoft' : 'bg-pqBorder')
                )}
              />
            ))}
          </div>
          <button
            type="button"
            data-tour-action="skip"
            onClick={finish}
            className="rounded-pqSm px-[10px] py-[6px] text-[13px] text-pqMuted hover:text-pqText"
          >
            {t('skip', 'Skip')}
          </button>
          <button
            type="button"
            data-tour-action="next"
            onClick={() => (last ? finish() : next())}
            className="rounded-pqSm bg-pqBrand px-[14px] py-[6px] text-[13px] font-[500] text-pqOnBrand hover:bg-pqBrandHover"
          >
            {last ? t('finish', 'Finish') : t('next', 'Next')}
          </button>
        </div>
      </div>
    </div>
  );
};
