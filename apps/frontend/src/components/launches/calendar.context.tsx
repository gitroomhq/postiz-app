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
  useState,
} from 'react';
import dayjs from 'dayjs';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Post, Integration, Tags } from '@prisma/client';
import { useSearchParams } from 'next/navigation';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { extend } from 'dayjs';
import useCookie from 'react-use-cookie';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { timer } from '@gitroom/helpers/utils/timer';
import { expandPostsList, expandPosts } from '@gitroom/helpers/utils/posts.list.minify';
import { useTourDemo } from '@gitroom/frontend/components/onboarding/tour';
extend(isoWeek);
extend(weekOfYear);

export type ListStateFilter = 'all' | 'scheduled' | 'draft' | 'published';

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
  const [displaySaved, setDisplaySaved] = useCookie('calendar-display', 'week');
  const display = searchParams.get('display') || displaySaved;

  // List view state
  const [listPage, setListPage] = useState(0);
  // Scheduled, not all: the posts panel opens on it and the design has no
  // "All" tab. The list view's own filter still offers All.
  const [listState, setListStateRaw] = useState<ListStateFilter>('scheduled');
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

  // List view data fetcher
  const listParams = useMemo(() => {
    return new URLSearchParams({
      page: listPage.toString(),
      limit: String(LIST_PAGE_SIZE),
      customer: filters?.customer?.toString() || '',
      state: listState,
    }).toString();
  }, [listPage, filters.customer, listState]);

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
          state: listState,
        }).toString();
        const response = await fetch(`/posts/list?${pageParams}`);
        return expandPostsList(await response.json());
      })
    );
    return {
      posts: pages.flatMap((page: any) => page?.posts || []),
      total: pages[0]?.total || 0,
    };
  }, [listPage, filters.customer, listState]);

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

      const path = [
        `startDate=${newFilters.startDate}`,
        `endDate=${newFilters.endDate}`,
        `display=${newFilters.display}`,
        newFilters.customer ? `customer=${newFilters.customer}` : ``,
      ].filter((f) => f);
      window.history.replaceState(null, '', `/launches?${path.join('&')}`);
    },
    []
  );

  const realPosts = useMemo(
    () => calendarData?.posts || [],
    [calendarData?.posts]
  );

  // The product tour's demo calendar. Only ever added on top of an *empty*
  // week — the moment there is a real post, `revealed` is ignored and the
  // user's own calendar is what they see. Nothing here is persisted or sent
  // anywhere; it exists for as long as step one of the tour is on screen.
  const demo = useTourDemo();
  const posts = useMemo(() => {
    if (!demo.length || realPosts.length) return realPosts;
    const weekStart = dayjs(filters.startDate).startOf('day');
    return demo.map(
      ({ day, hour, provider, title, body }, index) =>
        ({
          id: `pq-tour-demo-${index}`,
          // One paragraph: the card strips tags for its preview, so two would
          // run the title straight into the body with nothing between them.
          content: `<p>${title} — ${body}</p>`,
          publishDate: weekStart
            .add(day, 'day')
            .add(hour, 'hour')
            .utc()
            .format('YYYY-MM-DDTHH:mm:ss'),
          state: 'QUEUE',
          group: `pq-tour-demo-${index}`,
          integration: {
            id: `pq-tour-demo-integration-${index}`,
            name: title,
            picture: null,
            providerIdentifier: provider,
          },
          tags: [],
        } as any)
    );
  }, [realPosts, demo, filters.startDate]);
  const comments = useMemo(() => calendarData?.comments || [], [calendarData?.comments]);

  // List view data
  const listPosts = useMemo(() => listData?.posts || [], [listData?.posts]);
  const listTotal = listData?.total || 0;
  const listTotalPages = Math.ceil(listTotal / 100);

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

  return (
    <CalendarContext.Provider
      value={{
        trendings,
        reloadCalendarView,
        ...filters,
        posts: calendarIsLoading ? [] : internalData,
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
        postsPanelOpen,
        setPostsPanelOpen,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => useContext(CalendarContext);
