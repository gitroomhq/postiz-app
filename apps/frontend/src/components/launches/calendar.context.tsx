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
extend(isoWeek);
extend(weekOfYear);

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
  setListPage: (page: number) => {
    /** empty **/
  },
});

export interface Integrations {
  name: string;
  id: string;
  disabled?: boolean;
  inBetweenSteps: boolean;
  editor: 'none' | 'normal' | 'markdown' | 'html';
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
      limit: '100',
      customer: filters?.customer?.toString() || '',
    }).toString();
  }, [listPage, filters.customer]);

  const loadListData = useCallback(async () => {
    const response = await fetch(`/posts/list?${listParams}`);
    return expandPostsList(await response.json());
  }, [listParams]);

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
    filters.display === 'list' ? `/posts-list-${listParams}` : null,
    loadListData,
    {
      refreshInterval: 3600000,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
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

      // Reset page when switching to list view
      if (newFilters.display === 'list') {
        setListPage(0);
      }

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

  const posts = useMemo(() => calendarData?.posts || [], [calendarData?.posts]);
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
        setListPage,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => useContext(CalendarContext);
