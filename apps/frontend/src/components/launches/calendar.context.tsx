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
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Post, Integration, Tags } from '@prisma/client';
import { usePathname, useSearchParams } from 'next/navigation';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { extend } from 'dayjs';
import useCookie from 'react-use-cookie';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { timer } from '@gitroom/helpers/utils/timer';
import { expandPostsList, expandPosts } from '@gitroom/helpers/utils/posts.list.minify';
import { useTourDemo } from '@gitroom/frontend/components/onboarding/tour';
import {
  isUiDemoEnabled,
  UI_DEMO_ROWS,
  UI_DEMO_STORAGE_KEY,
} from '@gitroom/frontend/components/launches/ui-demo-posts';
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
  /** True when calendar/list are filled with non-persisted UI demo rows. */
  uiDemoActive: false,
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
}> = ({ children, integrations }) => {
  const fetch = useFetch();
  const [internalData, setInternalData] = useState([] as any[]);
  const [trendings] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [displaySaved, setDisplaySaved] = useCookie('calendar-display', 'week');
  const display = searchParams.get('display') || displaySaved;

  // List view state
  const [listPage, setListPage] = useState(0);
  // List toolbar defaults to All (owner). Posts panel tabs stay
  // Scheduled / Drafts / Posted only — no All there (design queue inventory).
  // Panel state is separate so calendar never inherits state=all (which hides
  // past drafts via publishDate >= now).
  const [listState, setListStateRaw] = useState<ListStateFilter>('all');
  const [panelListState, setPanelListStateRaw] =
    useState<PanelListStateFilter>('scheduled');
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
    },
    [panelPinScope]
  );

  // Persist uiDemo query into localStorage so a hard refresh keeps the fixture.
  useEffect(() => {
    const flag = searchParams.get('uiDemo');
    if (flag !== '1' && flag !== '0') return;
    try {
      localStorage.setItem(UI_DEMO_STORAGE_KEY, flag);
    } catch {
      /* private mode */
    }
  }, [searchParams]);

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

  // Reads every page up to the current one, not just the newest: the design's
  // list grows downward under a "Show more" button, so the pages already on
  // screen have to stay. Fetching the whole stack under one key also means an
  // edit or delete revalidates everything shown instead of leaving a stale
  // copy of an earlier page behind.
  const loadListData = useCallback(async () => {
    const pages = await Promise.all(
      Array.from({ length: listPage + 1 }, async (_, page) => {
        const pageParams = new URLSearchParams({
          page: page.toString(),
          limit: String(LIST_PAGE_SIZE),
          customer: filters?.customer?.toString() || '',
          state: activeListState,
        }).toString();
        const response = await fetch(`/posts/list?${pageParams}`);
        return expandPostsList(await response.json());
      })
    );
    return {
      posts: pages.flatMap((page: any) => page?.posts || []),
      total: pages[0]?.total || 0,
    };
  }, [listPage, filters.customer, activeListState, fetch]);

  // First open of the posts panel (or org/customer change): pick a tab that
  // has rows — scheduled → draft → published. Manual tab clicks stick via
  // pinnedPanelScope. List toolbar All default is untouched.
  useEffect(() => {
    if (!postsPanelOpen || filters.display === 'list') return;
    if (pinnedPanelScope.current === panelPinScope) return;

    let cancelled = false;
    const generation = ++panelPinGeneration.current;
    const scopeAtStart = panelPinScope;

    const customer = filters?.customer?.toString() || '';
    const probe = async (state: PanelListStateFilter) => {
      const params = new URLSearchParams({
        page: '0',
        limit: '1',
        customer,
        state,
      });
      const response = await fetch(`/posts/list?${params}`);
      if (!response.ok) return false;
      const data = await response.json();
      return (data?.total || 0) > 0;
    };

    (async () => {
      let next: PanelListStateFilter = 'published';
      if (await probe('scheduled')) next = 'scheduled';
      else if (await probe('draft')) next = 'draft';
      if (cancelled || generation !== panelPinGeneration.current) return;
      pinnedPanelScope.current = scopeAtStart;
      setPanelListStateRaw(next);
      setListPage(0);
    })();

    return () => {
      cancelled = true;
    };
  }, [postsPanelOpen, filters.display, panelPinScope, filters.customer, fetch]);

  // SWR for calendar view
  const {
    data: calendarData,
    isLoading: calendarIsLoading,
    mutate: mutateCalendar,
  } = useSWR(
    filters.display !== 'list' ? `/posts-${params}` : null,
    loadData,
    {
      refreshInterval: 3600000,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
    }
  );

  // SWR for list view
  const {
    data: listData,
    isLoading: listIsLoading,
    mutate: mutateList,
  } = useSWR(
    filters.display === 'list' || postsPanelOpen
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
    return (await fetch('/sets')).json();
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
  useEffect(() => {
    if (!pathname?.startsWith('/launches')) {
      return;
    }

    const fromUrl = searchParams.get('display');
    const urlDisplay = (fromUrl || displaySaved) as typeof filters.display;
    const urlStart = searchParams.get('startDate');
    const urlEnd = searchParams.get('endDate');
    const urlCustomer = searchParams.get('customer');
    const urlListDay = searchParams.get('listDay');

    // Rail navigations update the URL but not the cookie; keep them aligned.
    if (fromUrl && fromUrl !== displaySaved) {
      setDisplaySaved(fromUrl);
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
          : urlDisplay !== prev.display
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
  }, [pathname, searchParams, displaySaved, setDisplaySaved, requestScrollToNow]);

  const realPosts = useMemo(
    () => calendarData?.posts || [],
    [calendarData?.posts]
  );
  const rawListPosts = useMemo(() => listData?.posts || [], [listData?.posts]);

  // Tour stagger OR design fixture when the account is empty (dev / ?uiDemo=1).
  const tourDemo = useTourDemo();
  const uiDemoOn = isUiDemoEnabled(searchParams.get('uiDemo'));
  // Wait until the active fetch settles so real posts are not replaced by a
  // flash of fixture rows while SWR is still loading.
  const fetchSettled =
    filters.display === 'list' ? !listIsLoading : !calendarIsLoading;
  const uiDemoActive =
    uiDemoOn &&
    fetchSettled &&
    !realPosts.length &&
    !rawListPosts.length &&
    !tourDemo.length;

  const demoWeekStart = useMemo(
    () => newDayjs(filters.startDate).startOf('isoWeek'),
    [filters.startDate]
  );

  const mapUiDemo = useCallback(
    () =>
      UI_DEMO_ROWS.map((row, index) => {
        const publishDate = demoWeekStart
          .add(row.day, 'day')
          .hour(row.hour)
          .minute(0)
          .second(0);
        const past = publishDate.isBefore(newDayjs());
        const state =
          past && row.state === 'QUEUE' ? ('PUBLISHED' as const) : row.state;
        return {
          id: `pq-ui-demo-${index}`,
          content: `<p>${row.body}</p>`,
          publishDate: publishDate.utc().format('YYYY-MM-DDTHH:mm:ss'),
          state,
          group: `pq-ui-demo-${index}`,
          creationMethod: row.method,
          integration: {
            id: `pq-ui-demo-integration-${index}`,
            name: row.channel,
            picture: null,
            providerIdentifier: row.provider,
          },
          tags: row.tags.map((tag, ti) => ({
            tag: { id: `pq-ui-demo-tag-${index}-${ti}`, ...tag },
          })),
        };
      }),
    [demoWeekStart]
  );

  const mapTourDemo = useCallback(
    () =>
      tourDemo.map(({ day, hour, provider, title, body }, index) => {
        const publishDate = demoWeekStart.add(day, 'day').add(hour, 'hour');
        const past = publishDate.isBefore(newDayjs());
        return {
          id: `pq-tour-demo-${index}`,
          content: `<p>${title} — ${body}</p>`,
          publishDate: publishDate.utc().format('YYYY-MM-DDTHH:mm:ss'),
          state: (past ? 'PUBLISHED' : 'QUEUE') as 'PUBLISHED' | 'QUEUE',
          group: `pq-tour-demo-${index}`,
          creationMethod: 'WEB' as const,
          integration: {
            id: `pq-tour-demo-integration-${index}`,
            name: title,
            picture: null,
            providerIdentifier: provider,
          },
          tags: [],
        };
      }),
    [tourDemo, demoWeekStart]
  );

  const posts = useMemo(() => {
    if (realPosts.length) return realPosts;
    if (tourDemo.length) return mapTourDemo() as any[];
    if (uiDemoActive) return mapUiDemo() as any[];
    return realPosts;
  }, [realPosts, tourDemo.length, uiDemoActive, mapTourDemo, mapUiDemo]);
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
    if (!rows.length && !realPosts.length) {
      if (tourDemo.length) rows = mapTourDemo();
      else if (uiDemoActive) rows = mapUiDemo();
    }
    // Day deep-link: if the list endpoint hasn't returned that day yet, fall
    // back to calendar rows already on screen (See all from a cell).
    if (
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
    rawListPosts,
    matchChannel,
    realPosts,
    posts,
    tourDemo.length,
    uiDemoActive,
    mapTourDemo,
    mapUiDemo,
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

  // Combined reload function that handles both calendar and list views
  const reloadCalendarView = useCallback(() => {
    mutateCalendar();
    mutateList();
  }, [mutateCalendar, mutateList]);

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
        uiDemoActive,
        scrollToNowToken,
        requestScrollToNow,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => useContext(CalendarContext);
