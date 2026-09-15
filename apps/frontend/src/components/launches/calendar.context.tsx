'use client';

import 'reflect-metadata';
import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import dayjs from 'dayjs';
import useSWR, { useSWRConfig } from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import {
  dropPostGroupFromRows,
  dropPostGroupFromSwrData,
  isPostsSwrKey,
} from '@gitroom/frontend/components/launches/posts-swr';
import type { Post, Integration, Tags } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { usePathname, useSearchParams } from 'next/navigation';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { extend } from 'dayjs';
import useCookie from 'react-use-cookie';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { timer } from '@gitroom/helpers/utils/timer';
import { expandPostsList, expandPosts } from '@gitroom/helpers/utils/posts.list.minify';
import {
  pickPostsPanelTab,
  postsListHasRows,
} from '@gitroom/frontend/components/launches/posts-panel-tab';
import {
  TOUR_DEMO_PICTURE,
  useTourDemo,
  useTourRunning,
} from '@gitroom/frontend/components/onboarding/tour';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
extend(isoWeek);
extend(weekOfYear);

function localDayKey(publishDate: string | Date) {
  return dayjs.utc(publishDate).local().format('YYYY-MM-DD');
}

export type ListStateFilter = 'all' | 'scheduled' | 'draft' | 'published';
/** Posts panel tabs — no All (design queue inventory). */
export type PanelListStateFilter = 'scheduled' | 'draft' | 'published';
/** Prototype listRange: presets, or `day:YYYY-MM-DD` from calendar See all. */
export type ListRangeFilter =
  | 'all'
  | 'today'
  | 'tomorrow'
  | 'yesterday'
  | 'week'
  | 'next3'
  | 'next7'
  | 'month'
  | 'nextMonth'
  | 'pastWeek'
  | 'past'
  | `day:${string}`;
export type ListSortOrder = 'asc' | 'desc';

/** Ranges that only make sense with past rows (Drafts / Posted). */
export const PAST_ORIENTED_LIST_RANGES: readonly ListRangeFilter[] = [
  'past',
  'yesterday',
  'pastWeek',
];

function isPastOrientedListRange(range: ListRangeFilter) {
  return (PAST_ORIENTED_LIST_RANGES as readonly string[]).includes(range);
}

function postInListRange(
  publishDate: string | Date,
  range: ListRangeFilter,
  weekStart: dayjs.Dayjs
) {
  const d = dayjs.utc(publishDate).local().startOf('day');
  const today = newDayjs().startOf('day');
  if (range === 'all') return true;
  if (range.startsWith('day:')) {
    return d.format('YYYY-MM-DD') === range.slice(4);
  }
  if (range === 'today') return d.isSame(today, 'day');
  if (range === 'tomorrow') return d.isSame(today.add(1, 'day'), 'day');
  if (range === 'yesterday') return d.isSame(today.subtract(1, 'day'), 'day');
  if (range === 'week') {
    return (
      !d.isBefore(weekStart, 'day') &&
      !d.isAfter(weekStart.add(6, 'day'), 'day')
    );
  }
  if (range === 'next3') {
    return (
      !d.isBefore(today, 'day') && !d.isAfter(today.add(2, 'day'), 'day')
    );
  }
  if (range === 'next7') {
    return (
      !d.isBefore(today, 'day') && !d.isAfter(today.add(6, 'day'), 'day')
    );
  }
  if (range === 'month') {
    const start = today.startOf('month');
    const end = today.endOf('month').startOf('day');
    return !d.isBefore(start, 'day') && !d.isAfter(end, 'day');
  }
  if (range === 'nextMonth') {
    const start = today.add(1, 'month').startOf('month');
    const end = today.add(1, 'month').endOf('month').startOf('day');
    return !d.isBefore(start, 'day') && !d.isAfter(end, 'day');
  }
  if (range === 'pastWeek') {
    // Previous ISO week (Mon–Sun), pairing with "This week".
    const start = weekStart.subtract(7, 'day');
    const end = weekStart.subtract(1, 'day');
    return !d.isBefore(start, 'day') && !d.isAfter(end, 'day');
  }
  if (range === 'past') return d.isBefore(today, 'day');
  return true;
}

const LIST_PAGE_SIZE = 100;

export const CalendarContext = createContext({
  startDate: newDayjs().startOf('isoWeek').format('YYYY-MM-DD'),
  endDate: newDayjs().endOf('isoWeek').format('YYYY-MM-DD'),
  customer: null as string | null,
  loading: true,
  sets: [] as { name: string; id: string; content: string[] }[],
  signature: undefined as any,
  comments: [] as Array<{
    date: string;
    total: number;
  }>,
  integrations: [] as (Integrations & {
    refreshNeeded?: boolean;
  })[],
  trendings: [] as string[],
  posts: [] as Array<
    Post & {
      integration: Integration;
      tags: {
        tag: Tags;
      }[];
    }
  >,
  reloadCalendarView: () => {
    /** empty **/
  },
  dropPostGroupFromView: (_groupId: string) => {
    /** empty **/
  },
  display: 'week',
  setFilters: (filters: {
    startDate: string;
    endDate: string;
    display: 'week' | 'month' | 'day' | 'list';
    customer: string | null;
  }) => {
    /** empty **/
  },
  changeDate: (id: string, date: dayjs.Dayjs) => {
    /** empty **/
  },
  // List view specific
  listPosts: [] as Array<
    Post & {
      integration: Integration;
      tags: {
        tag: Tags;
      }[];
    }
  >,
  // The posts panel reads `listPosts` in every display, so it needs the list
  // request's own state — `loading` above follows whichever view is on screen.
  listLoading: true,
  listPage: 0,
  listTotalPages: 0,
  listTotal: 0,
  postsPanelOpen: true,
  setPostsPanelOpen: (open: boolean) => {
    /** empty **/
  },
  setListPage: (page: number) => {
    /** empty **/
  },
  listState: 'all' as ListStateFilter,
  setListState: (state: ListStateFilter) => {
    /** empty **/
  },
  // Calendar posts panel — separate from list toolbar All default.
  panelListState: 'scheduled' as PanelListStateFilter,
  setPanelListState: (_state: PanelListStateFilter) => {
    /** empty **/
  },
  listRange: 'all' as ListRangeFilter,
  setListRange: (_range: ListRangeFilter) => {
    /** empty **/
  },
  listSort: 'asc' as ListSortOrder,
  setListSort: (_sort: ListSortOrder) => {
    /** empty **/
  },
  openPostsForDay: (_date: dayjs.Dayjs) => {
    /** empty **/
  },
  // Empty = all channels (design chanFilter). Client-side only — same posts
  // payload, filtered for the grid and the posts panel.
  channelFilter: [] as string[],
  setChannelFilter: (ids: string[]) => {
    /** empty **/
  },
  /** Bumped by Today to scroll Day/Week to the current hour. */
  scrollToNowToken: 0,
  requestScrollToNow: () => {
    /** empty **/
  },
});

export interface Integrations {
  name: string;
  id: string;
  disabled?: boolean;
  // Returned by `/integrations/list` and read by every channel picker; it was
  // only ever reached through `any` casts, so the field was missing here.
  refreshNeeded?: boolean;
  inBetweenSteps: boolean;
  editor: 'none' | 'normal' | 'markdown' | 'html';
  stripLinks?: boolean;
  display: string;
  identifier: string;
  type: string;
  picture: string;
  changeProfilePicture: boolean;
  additionalSettings: string;
  changeNickName: boolean;
  time: {
    time: number;
  }[];
  customer?: {
    name?: string;
    id?: string;
  };
}

// Helper function to get start and end dates based on display type
function getDateRange(display: string, referenceDate?: string) {
  const date = referenceDate ? newDayjs(referenceDate) : newDayjs();

  switch (display) {
    case 'day':
      return {
        startDate: date.format('YYYY-MM-DD'),
        endDate: date.format('YYYY-MM-DD'),
      };
    case 'week':
      return {
        startDate: date.startOf('isoWeek').format('YYYY-MM-DD'),
        endDate: date.endOf('isoWeek').format('YYYY-MM-DD'),
      };
    case 'month':
      return {
        startDate: date.startOf('month').format('YYYY-MM-DD'),
        endDate: date.endOf('month').format('YYYY-MM-DD'),
      };
    default:
      return {
        startDate: date.startOf('isoWeek').format('YYYY-MM-DD'),
        endDate: date.endOf('isoWeek').format('YYYY-MM-DD'),
      };
  }
}

export const CalendarWeekProvider: FC<{
  children: ReactNode;
  integrations: Integrations[];
  /**
   * "The calendar grid is on screen." Only `launches.component.tsx` passes it,
   * because only it mounts this provider around a skeleton — deliberately, so
   * the posts wave is not held behind `/integrations/list`. The tour's demo
   * choreography reaches into the grid's DOM, so it has to wait for that.
   */
  ready?: boolean;
}> = ({ children, integrations, ready = true }) => {
  const fetch = useFetch();
  const { mutate: globalMutate } = useSWRConfig();
  const [internalData, setInternalData] = useState([] as any[]);
  const [trendings] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [displaySaved, setDisplaySaved] = useCookie('calendar-display', 'week');
  const tourRunning = useTourRunning();
  // Bare `/launches` (login, `/`, bookmarks) must open week calendar — never
  // the Posts list cookie. List only when the URL says `display=list`.
  const display = searchParams.get('display') || 'week';

  // List view state
  const [listPage, setListPage] = useState(0);
  // List toolbar defaults to All (owner). Posts panel tabs stay
  // Scheduled / Drafts / Posted only — no All there (design queue inventory).
  // Panel state is separate so calendar never inherits state=all (which hides
  // past drafts via publishDate >= now).
  const [listState, setListStateRaw] = useState<ListStateFilter>('all');
  const [panelListState, setPanelListStateRaw] =
    useState<PanelListStateFilter>('scheduled');
  // Welcome-tab probe must finish before the list fetch, or Scheduled paints
  // empty while we still do not know Drafts/Posted have rows.
  const [panelTabResolved, setPanelTabResolved] = useState(false);
  // Last org|customer scope we auto-pinned (or manually stuck) for the panel.
  const pinnedPanelScope = useRef<string | null>(null);
  // Bumped to drop a stale probe result after a manual tab click.
  const panelPinGeneration = useRef(0);
  const user = useUser();
  // The design keeps a posts panel beside the calendar, and lets you hide it.
  // Its data is the list view's, so the list query has to run when the panel is
  // open as well — and stop when it is hidden, which is the point of a toggle.
  const [postsPanelCookie, setPostsPanelCookie] = useCookie('postsPanel', '1');
  const postsPanelOpen = postsPanelCookie !== '0';
  const setPostsPanelOpen = useCallback(
    (open: boolean) => setPostsPanelCookie(open ? '1' : '0', { days: 365 }),
    [setPostsPanelCookie]
  );
  const setListState = useCallback((next: ListStateFilter) => {
    setListStateRaw(next);
    setListPage(0);
    // Past-oriented ranges are empty for Scheduled (future QUEUE only).
    if (next === 'scheduled' && isPastOrientedListRange(listRangeRef.current)) {
      setListRangeRaw('all');
    }
  }, []);

  const [channelFilter, setChannelFilter] = useState<string[]>([]);
  const [scrollToNowToken, setScrollToNowToken] = useState(0);
  const requestScrollToNow = useCallback(() => {
    setScrollToNowToken((n) => n + 1);
  }, []);
  const initListDay = searchParams.get('listDay');
  const [listRange, setListRangeRaw] = useState<ListRangeFilter>(
    initListDay ? (`day:${initListDay}` as ListRangeFilter) : 'all'
  );
  // Keep a ref so event-handler URL writes can read the latest range without
  // putting side effects inside a setState updater (those run during render).
  const listRangeRef = useRef(listRange);
  listRangeRef.current = listRange;
  // Prototype default for the Posts list is Oldest (asc).
  const [listSort, setListSortRaw] = useState<ListSortOrder>('asc');
  const setListRange = useCallback((next: ListRangeFilter) => {
    setListRangeRaw(next);
    setListPage(0);
  }, []);
  const setListSort = useCallback((next: ListSortOrder) => {
    setListSortRaw(next);
    setListPage(0);
  }, []);

  // Initialize with current date range based on URL params or defaults
  const initStartDate = searchParams.get('startDate');
  const initEndDate = searchParams.get('endDate');
  const initCustomer = searchParams.get('customer');

  const initialRange =
    initStartDate && initEndDate
      ? { startDate: initStartDate, endDate: initEndDate }
      : getDateRange(display);

  const [filters, setFilters] = useState({
    startDate: initialRange.startDate,
    endDate: initialRange.endDate,
    customer: initCustomer || null,
    display,
  });

  const panelPinScope = `${user?.orgId || ''}|${filters.customer || ''}`;
  const setPanelListState = useCallback(
    (next: PanelListStateFilter) => {
      // Manual tab click — stick until org/customer changes.
      panelPinGeneration.current += 1;
      pinnedPanelScope.current = panelPinScope;
      setPanelListStateRaw(next);
      setListPage(0);
      setPanelTabResolved(true);
    },
    [panelPinScope]
  );

  const params = useMemo(() => {
    return new URLSearchParams({
      display: filters.display,
      startDate: filters.startDate,
      endDate: filters.endDate,
      customer: filters?.customer?.toString() || '',
    }).toString();
  }, [filters]);

  // Calendar view data fetcher
  const loadData = useCallback(async () => {
    const modifiedParams = new URLSearchParams({
      display: filters.display,
      customer: filters?.customer?.toString() || '',
      startDate: newDayjs(filters.startDate).startOf('day').utc().format(),
      endDate: newDayjs(filters.endDate).endOf('day').utc().format(),
    }).toString();

    const data = await (await fetch(`/posts?${modifiedParams}`)).json();
    return expandPosts(data);
  }, [filters, params]);

  // List view uses toolbar All/Scheduled/…; calendar panel uses its own tab.
  const activeListState: ListStateFilter =
    filters.display === 'list' ? listState : panelListState;

  // List view data fetcher
  const listParams = useMemo(() => {
    return new URLSearchParams({
      page: listPage.toString(),
      limit: String(LIST_PAGE_SIZE),
      customer: filters?.customer?.toString() || '',
      state: activeListState,
    }).toString();
  }, [listPage, filters.customer, activeListState]);

  // One page at a time (Previous / page / Next) — same model as Insert media.
  // Earlier "Show more" stacked every page under one key; edits then had to
  // revalidate the whole stack. Single-page fetch keeps SWR and the UI simple.
  const loadListData = useCallback(async () => {
    const pageParams = new URLSearchParams({
      page: listPage.toString(),
      limit: String(LIST_PAGE_SIZE),
      customer: filters?.customer?.toString() || '',
      state: activeListState,
    }).toString();
    const response = await fetch(`/posts/list?${pageParams}`);
    const data = expandPostsList(await response.json());
    return {
      posts: data?.posts || [],
      total: data?.total || 0,
    };
  }, [listPage, filters.customer, activeListState, fetch]);

  // First open of the posts panel (or org/customer change): pick a tab that
  // has rows — scheduled → draft → published. Manual tab clicks stick via
  // pinnedPanelScope. List toolbar All default is untouched.
  useEffect(() => {
    if (!postsPanelOpen || filters.display === 'list') return;
    if (pinnedPanelScope.current === panelPinScope) {
      setPanelTabResolved(true);
      return;
    }

    let cancelled = false;
    const generation = ++panelPinGeneration.current;
    const scopeAtStart = panelPinScope;
    setPanelTabResolved(false);

    const customer = filters?.customer?.toString() || '';
    const probe = async (state: PanelListStateFilter) => {
      const params = new URLSearchParams({
        page: '0',
        limit: '1',
        customer,
        state,
      });
      // Nobody asked for this — it only picks which tab opens first. A network
      // reject here must not bubble: unhandled, it would surface as a toast
      // from NetworkErrorBridge for a request the user never made. Falling back
      // to `false` just leaves the default tab selected.
      try {
        const response = await fetch(`/posts/list?${params}`);
        if (!response.ok) return false;
        return postsListHasRows(await response.json());
      } catch {
        return false;
      }
    };

    (async () => {
      // Nothing anywhere lands on Scheduled, not Posted: an account with no
      // posts at all has never posted either, and "nothing published yet" is a
      // worse first thing to say than "nothing scheduled yet". The tour's first
      // queue step meets exactly this state.
      const scheduled = await probe('scheduled');
      const draft = scheduled ? false : await probe('draft');
      const published = scheduled || draft ? false : await probe('published');
      const next = pickPostsPanelTab({ scheduled, draft, published });
      if (cancelled || generation !== panelPinGeneration.current) return;
      pinnedPanelScope.current = scopeAtStart;
      setPanelListStateRaw(next);
      setListPage(0);
      setPanelTabResolved(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [postsPanelOpen, filters.display, panelPinScope, filters.customer, fetch]);

  // SWR for calendar view
  const {
    data: calendarData,
    isLoading: calendarIsLoading,
  } = useSWR(
    filters.display !== 'list' ? `/posts-${params}` : null,
    loadData,
    {
      refreshInterval: 3600000,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      // The key carries the range, so every arrow click is a new key. Without
      // this `calendarData` goes undefined mid-navigation and anything reading
      // it unmounts; the cells are blanked deliberately just below instead.
      keepPreviousData: true,
    }
  );

  // SWR for list view
  const {
    data: listData,
    isLoading: listIsLoading,
  } = useSWR(
    filters.display === 'list' || (postsPanelOpen && panelTabResolved)
      ? `/posts-list-${listParams}`
      : null,
    loadListData,
    {
      refreshInterval: 3600000,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      // "Show more" and the panel tabs change the key; without this the rows
      // already read blink out for a spinner. The design appends beneath them.
      keepPreviousData: true,
    }
  );

  const defaultSign = useCallback(async () => {
    return await (await fetch('/signatures/default')).json();
  }, []);

  const setList = useCallback(async () => {
    // Second fetcher on the same `'sets'` SWR key as `use.sets.tsx`. SWR
    // de-dupes by key, so which of the two actually runs depends on mount
    // order — they have to agree, which is why both got this guard together.
    const response = await fetch('/sets');
    if (!response.ok) {
      throw new Error('Could not load sets');
    }
    const sets = await response.json();
    return Array.isArray(sets) ? sets : [];
  }, []);

  const { data: sets, mutate } = useSWR('sets', setList, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
  const { data: sign } = useSWR('default-sign', defaultSign, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });

  const writeLaunchesUrl = useCallback(
    (
      next: {
        startDate: string;
        endDate: string;
        display: string;
        customer: string | null;
      },
      range: ListRangeFilter
    ) => {
      const path = [
        `startDate=${next.startDate}`,
        `endDate=${next.endDate}`,
        `display=${next.display}`,
        next.customer ? `customer=${next.customer}` : '',
        range.startsWith('day:') ? `listDay=${range.slice(4)}` : '',
      ].filter((f) => f);
      window.history.replaceState(null, '', `/launches?${path.join('&')}`);
    },
    []
  );

  const setFiltersWrapper = useCallback(
    (newFilters: {
      startDate: string;
      endDate: string;
      display: 'week' | 'month' | 'day' | 'list';
      customer: string | null;
    }) => {
      setDisplaySaved(newFilters.display);
      setFilters(newFilters);
      setInternalData([]);

      // Reset paging on every display switch, not just into list: the posts
      // panel shares the list query, so a page count left behind by the list
      // view would make the panel fetch the whole stack of pages.
      setListPage(0);

      // Leaving Posts clears a day chip; entering list without a day keeps it.
      // writeLaunchesUrl must stay outside setState updaters — React runs those
      // during render, and replaceState updates Next's Router mid-render.
      if (newFilters.display !== 'list') {
        setListRangeRaw('all');
        writeLaunchesUrl(newFilters, 'all');
      } else {
        writeLaunchesUrl(newFilters, listRangeRef.current);
      }
    },
    [setDisplaySaved, writeLaunchesUrl]
  );

  // Rail Link → `/launches?display=list` updates Next searchParams without
  // remounting this provider; keep filters.display in lockstep.
  // Soft-open Settings/Connect keep this provider mounted under `/settings` or
  // `/connections` (no `display` query). Falling back to the cookie then flips
  // Calendar↔Posts — bail unless we are still on launches.
  // When URL has no range, switching into week (e.g. login / bare /launches)
  // must land on the *current* week — not a stale range left from list view.
  useEffect(() => {
    if (!pathname?.startsWith('/launches')) {
      return;
    }

    const fromUrl = searchParams.get('display');
    // No `display` in the URL = Calendar home (week), not the last Posts visit.
    const urlDisplay = (fromUrl || 'week') as typeof filters.display;
    const urlStart = searchParams.get('startDate');
    const urlEnd = searchParams.get('endDate');
    const urlCustomer = searchParams.get('customer');
    const urlListDay = searchParams.get('listDay');

    // Rail navigations update the URL but not the cookie; keep them aligned.
    //
    // Except while the tour is running: it pins `display=week` for its own two
    // calendar steps, and writing that through would take somebody who lives on
    // the Posts list and leave them on the week view for a year afterwards. The
    // tour is supposed to outlive nothing.
    if (fromUrl && fromUrl !== displaySaved && !tourRunning) {
      setDisplaySaved(fromUrl);
    }
    if (!fromUrl && displaySaved !== 'week') {
      setDisplaySaved('week');
    }

    setFilters((prev) => {
      if (
        prev.display === urlDisplay &&
        (!urlStart || prev.startDate === urlStart) &&
        (!urlEnd || prev.endDate === urlEnd) &&
        (urlCustomer === null
          ? true
          : prev.customer === (urlCustomer || null))
      ) {
        return prev;
      }
      const range =
        urlStart && urlEnd
          ? { startDate: urlStart, endDate: urlEnd }
          : urlDisplay !== prev.display || !fromUrl
          ? getDateRange(urlDisplay)
          : { startDate: prev.startDate, endDate: prev.endDate };
      return {
        startDate: range.startDate,
        endDate: range.endDate,
        customer:
          urlCustomer !== null ? urlCustomer || null : prev.customer,
        display: urlDisplay,
      };
    });
    if (urlListDay) {
      setListRangeRaw(`day:${urlListDay}`);
    } else if (urlDisplay !== 'list') {
      setListRangeRaw('all');
    }

    // Logo / home: `now=<ts>` recenters Day/Week on the current hour, then
    // strip the param so the address bar stays clean.
    if (searchParams.get('now')) {
      requestScrollToNow();
      const cleaned = new URLSearchParams(searchParams.toString());
      cleaned.delete('now');
      const q = cleaned.toString();
      window.history.replaceState(
        null,
        '',
        q ? `/launches?${q}` : '/launches'
      );
    }
  }, [
    pathname,
    searchParams,
    displaySaved,
    setDisplaySaved,
    requestScrollToNow,
    tourRunning,
  ]);

  const realPosts = useMemo(
    () => calendarData?.posts || [],
    [calendarData?.posts]
  );
  const rawListPosts = useMemo(() => listData?.posts || [], [listData?.posts]);

  // Tour stagger when the account is empty and the tour is running.
  const tourDemo = useTourDemo(ready);

  const demoWeekStart = useMemo(
    () => newDayjs(filters.startDate).startOf('isoWeek'),
    [filters.startDate]
  );

  const mapTourDemo = useCallback(
    () =>
      tourDemo.map(
        ({ id, day, hour, provider, channelName, title, body }, index) => {
          const publishDate = demoWeekStart.add(day, 'day').add(hour, 'hour');
          const past = publishDate.isBefore(newDayjs());
          return {
            // The hook names the rows: the rescheduled one keeps one id across
            // both hours so the drag ghost can find it on the way out.
            id,
            content: `<p>${title} — ${body}</p>`,
            publishDate: publishDate.utc().format('YYYY-MM-DDTHH:mm:ss'),
            state: (past ? 'PUBLISHED' : 'QUEUE') as 'PUBLISHED' | 'QUEUE',
            group: id,
            creationMethod: 'WEB' as const,
            integration: {
              id: `pq-tour-demo-integration-${index}`,
              name: channelName,
              picture: TOUR_DEMO_PICTURE,
              providerIdentifier: provider,
            },
            tags: [] as { tag: Tags }[],
          };
        }
      ),
    [tourDemo, demoWeekStart]
  );

  const posts = useMemo(() => {
    if (realPosts.length) return realPosts;
    if (tourDemo.length) return mapTourDemo() as any[];
    return realPosts;
  }, [realPosts, tourDemo.length, mapTourDemo]);
  const comments = useMemo(() => calendarData?.comments || [], [calendarData?.comments]);

  const matchChannel = useCallback(
    (post: any) => {
      if (!channelFilter.length) return true;
      const id = post?.integration?.id || post?.integrationId;
      return !!id && channelFilter.includes(id);
    },
    [channelFilter]
  );

  const listPosts = useMemo(() => {
    const weekStart = demoWeekStart;
    let rows: any[] = rawListPosts.filter(matchChannel);
    if (!rows.length && !realPosts.length && tourDemo.length) {
      rows = mapTourDemo();
    }
    // Day deep-link: if this list page has not loaded yet, fall back to
    // calendar rows already on screen (See all from a cell). After the list
    // fetch (or an optimistic delete) has a payload, do not resurrect rows
    // from the other view's keepPreviousData cache.
    if (
      !listData &&
      listRange.startsWith('day:') &&
      !rows.some((p) => postInListRange(p.publishDate, listRange, weekStart))
    ) {
      const dayRows = (realPosts.length ? realPosts : posts).filter(
        (p: { publishDate: string | Date }) =>
          postInListRange(p.publishDate, listRange, weekStart)
      );
      if (dayRows.length) rows = dayRows;
    }
    rows = rows.filter((p) =>
      postInListRange(p.publishDate, listRange, weekStart)
    );
    rows = [...rows].sort((a, b) => {
      const ta = dayjs.utc(a.publishDate).valueOf();
      const tb = dayjs.utc(b.publishDate).valueOf();
      return listSort === 'asc' ? ta - tb : tb - ta;
    });
    return rows;
  }, [
    listData,
    rawListPosts,
    matchChannel,
    realPosts,
    posts,
    tourDemo.length,
    mapTourDemo,
    demoWeekStart,
    listRange,
    listSort,
  ]);

  // Always use the server total for pagination. Client channel/range filters
  // shrink the *current page* only — deriving hasMore from that length stopped
  // "Show more" early while later pages still matched.
  const listTotal = listData?.total || 0;
  const listTotalPages = Math.max(
    1,
    Math.ceil((listData?.total || 0) / LIST_PAGE_SIZE)
  );

  const openPostsForDay = useCallback(
    (date: dayjs.Dayjs) => {
      const day = date.format('YYYY-MM-DD');
      const range = `day:${day}` as ListRangeFilter;
      setListRangeRaw(range);
      setListPage(0);
      const next = {
        startDate: day,
        endDate: day,
        display: 'list' as const,
        customer: filters.customer,
      };
      setDisplaySaved('list');
      setFilters(next);
      writeLaunchesUrl(next, range);
    },
    [filters.customer, setDisplaySaved, writeLaunchesUrl]
  );

  const setListRangeAndUrl = useCallback(
    (next: ListRangeFilter) => {
      setListRange(next);
      writeLaunchesUrl(
        {
          startDate: filters.startDate,
          endDate: filters.endDate,
          display: filters.display,
          customer: filters.customer,
        },
        next
      );
    },
    [setListRange, writeLaunchesUrl, filters]
  );

  const changeDate = useCallback(
    (id: string, date: dayjs.Dayjs) => {
      setInternalData((d) =>
        d.map((post: Post) => {
          if (post.id === id) {
            return {
              ...post,
              publishDate: date.utc().format('YYYY-MM-DDTHH:mm:ss'),
            };
          }
          return post;
        })
      );
    },
    [posts, internalData]
  );

  useEffect(() => {
    if (posts) {
      setInternalData(posts);
    }
  }, [posts]);

  // Bound mutate on a null-key hook is a no-op (list view unbinds calendar,
  // calendar view unbinds list unless the panel is open). Prefix-match every
  // `/posts-` key so both caches, including keepPreviousData from the other
  // view, actually refetch.
  const reloadCalendarView = useCallback(() => {
    void globalMutate(isPostsSwrKey, undefined, { revalidate: true });
  }, [globalMutate]);

  const dropPostGroupFromView = useCallback(
    (groupId: string) => {
      if (!groupId) return;
      setInternalData((d) => dropPostGroupFromRows(d, groupId));
      void globalMutate(
        isPostsSwrKey,
        (current) => dropPostGroupFromSwrData(current, groupId),
        { revalidate: true }
      );
    },
    [globalMutate]
  );

  // Determine loading state based on current view
  const loading = filters.display === 'list' ? listIsLoading : calendarIsLoading;

  const calendarPosts = useMemo(() => {
    const base = calendarIsLoading ? [] : internalData;
    // Belt-and-suspenders with getPosts `state: { not: DRAFT }` — demo /
    // optimistic / stale SWR must not leave drafts on Day/Week/Month.
    return base.filter(
      (p) => p.state !== 'DRAFT' && matchChannel(p)
    );
  }, [calendarIsLoading, internalData, matchChannel]);

  return (
    <CalendarContext.Provider
      value={{
        trendings,
        reloadCalendarView,
        dropPostGroupFromView,
        ...filters,
        posts: calendarPosts,
        loading,
        integrations,
        setFilters: setFiltersWrapper,
        changeDate,
        comments,
        sets: sets || [],
        signature: sign,
        // List view specific
        listPosts,
        listLoading:
          listIsLoading ||
          (postsPanelOpen && filters.display !== 'list' && !panelTabResolved),
        listPage,
        listTotalPages,
        listTotal,
        setListPage,
        listState,
        setListState,
        panelListState,
        setPanelListState,
        listRange,
        setListRange: setListRangeAndUrl,
        listSort,
        setListSort,
        openPostsForDay,
        postsPanelOpen,
        setPostsPanelOpen,
        channelFilter,
        setChannelFilter,
        scrollToNowToken,
        requestScrollToNow,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => useContext(CalendarContext);
