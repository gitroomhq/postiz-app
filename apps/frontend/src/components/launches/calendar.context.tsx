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
extend(isoWeek);
extend(weekOfYear);
export const CalendarContext = createContext({
  currentDay: dayjs().day() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
  currentWeek: dayjs().week(),
  currentYear: dayjs().year(),
  currentMonth: dayjs().month(),
  customer: null as string | null,
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
    currentWeek: number;
    currentYear: number;
    currentDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    currentMonth: number;
    display: 'week' | 'month' | 'day';
    customer: string | null;
  }) => {
    /** empty **/
  },
  changeDate: (id: string, date: dayjs.Dayjs) => {
    /** empty **/
  },
});
export interface Integrations {
  name: string;
  id: string;
  disabled?: boolean;
  inBetweenSteps: boolean;
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
function getWeekNumber(date: Date) {
  // Copy date so don't modify original
  const targetDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  targetDate.setUTCDate(
    targetDate.getUTCDate() + 4 - (targetDate.getUTCDay() || 7)
  );
  // Get first day of year
  const yearStart = new Date(Date.UTC(targetDate.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  return Math.ceil(
    ((targetDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
}
export const CalendarWeekProvider: FC<{
  children: ReactNode;
  integrations: Integrations[];
}> = ({ children, integrations }) => {
  const fetch = useFetch();
  const [internalData, setInternalData] = useState([] as any[]);
  const [trendings] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const display = searchParams.get('display') || 'week';
  const [filters, setFilters] = useState({
    currentDay: +(searchParams.get('day') || dayjs().day()) as
      | 0
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6,
    currentWeek: +(searchParams.get('week') || getWeekNumber(new Date())),
    currentMonth: +(searchParams.get('month') || dayjs().month()),
    currentYear: +(searchParams.get('year') || dayjs().year()),
    customer: (searchParams.get('customer') as string) || null,
    display,
  });
  const params = useMemo(() => {
    return new URLSearchParams({
      display: filters.display,
      day: filters.currentDay.toString(),
      week: filters.currentWeek.toString(),
      month: (filters.currentMonth + 1).toString(),
      year: filters.currentYear.toString(),
      customer: filters?.customer?.toString() || '',
    }).toString();
  }, [filters, display]);
  const loadData = useCallback(async () => {
    const data = (await fetch(`/posts?${params}`)).json();
    return data;
  }, [filters, params]);
  const swr = useSWR(`/posts-${params}`, loadData, {
    refreshInterval: 3600000,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
  });

  const defaultSign = useCallback(async () => {
    return await (await fetch('/signatures/default')).json();
  }, []);

  const setList = useCallback(async () => {
    return (await fetch('/sets')).json();
  }, []);

  const { data: sets, mutate } = useSWR('sets', setList);
  const { data: sign} = useSWR('default-sign', defaultSign);

  const setFiltersWrapper = useCallback(
    (filters: {
      currentDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      currentWeek: number;
      currentYear: number;
      currentMonth: number;
      display: 'week' | 'month' | 'day';
      customer: string | null;
    }) => {
      setFilters(filters);
      setInternalData([]);
      const path = [
        `day=${filters.currentDay}`,
        `week=${filters.currentWeek}`,
        `month=${filters.currentMonth}`,
        `year=${filters.currentYear}`,
        `display=${filters.display}`,
        filters.customer ? `customer=${filters.customer}` : ``,
      ].filter((f) => f);
      window.history.replaceState(null, '', `/launches?${path.join('&')}`);
    },
    [filters, swr.mutate]
  );
  const { isLoading } = swr;
  const { posts, comments } = swr?.data || {
    posts: [],
    comments: [],
  };
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
  return (
    <CalendarContext.Provider
      value={{
        trendings,
        reloadCalendarView: swr.mutate,
        ...filters,
        posts: isLoading ? [] : internalData,
        integrations,
        setFilters: setFiltersWrapper,
        changeDate,
        comments,
        sets: sets || [],
        signature: sign,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};
export const useCalendar = () => useContext(CalendarContext);
