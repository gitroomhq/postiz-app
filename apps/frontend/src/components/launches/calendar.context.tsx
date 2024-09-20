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
import { Post, Integration } from '@prisma/client';
import { useSearchParams } from 'next/navigation';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);

export const CalendarContext = createContext({
  currentDay: dayjs().day() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
  currentWeek: dayjs().week(),
  currentYear: dayjs().year(),
  currentMonth: dayjs().month(),
  comments: [] as Array<{ date: string; total: number }>,
  integrations: [] as Integrations[],
  trendings: [] as string[],
  posts: [] as Array<Post & { integration: Integration }>,
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
  identifier: string;
  type: string;
  picture: string;
  time: { time: number }[];
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
    display,
  });

  const params = useMemo(() => {
    return new URLSearchParams({
      display: filters.display,
      day: filters.currentDay.toString(),
      week: filters.currentWeek.toString(),
      month: (filters.currentMonth + 1).toString(),
      year: filters.currentYear.toString(),
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

  const setFiltersWrapper = useCallback(
    (filters: {
      currentDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      currentWeek: number;
      currentYear: number;
      currentMonth: number;
      display: 'week' | 'month' | 'day';
    }) => {
      setFilters(filters);
      setInternalData([]);

      const path = [
        `day=${filters.currentDay}`,
        `week=${filters.currentWeek}`,
        `month=${filters.currentMonth}`,
        `year=${filters.currentYear}`,
        `display=${filters.display}`,
      ].filter((f) => f);
      window.history.replaceState(null, '', `/launches?${path.join('&')}`);
    },
    [filters, swr.mutate]
  );

  const { isLoading } = swr;
  const { posts, comments } = swr?.data || { posts: [], comments: [] };

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
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => useContext(CalendarContext);
