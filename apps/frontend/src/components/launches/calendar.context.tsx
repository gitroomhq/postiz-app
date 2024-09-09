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
import useSWR, { useSWRConfig } from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Post, Integration } from '@prisma/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { isGeneral } from '@gitroom/react/helpers/is.general';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);

const CalendarContext = createContext({
  currentWeek: dayjs().week(),
  currentYear: dayjs().year(),
  currentMonth: dayjs().month(),
  comments: [] as Array<{ date: string; total: number }>,
  integrations: [] as Integrations[],
  trendings: [] as string[],
  posts: [] as Array<Post & { integration: Integration }>,
  reloadCalendarView: () => {/** empty **/},
  display: 'week',
  setFilters: (filters: {
    currentWeek: number;
    currentYear: number;
    currentMonth: number;
    display: 'week' | 'month';
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

  const display = searchParams.get('month') ? 'month' : 'week';
  const [filters, setFilters] = useState({
    currentWeek:
      display === 'week'
        ? +(searchParams.get('week') || getWeekNumber(new Date()))
        : 0,
    currentMonth:
      display === 'week' ? 0 : +(searchParams.get('month') || dayjs().month()),
    currentYear: +(searchParams.get('year') || dayjs().year()),
    display,
  });

  const params = useMemo(() => {
    return new URLSearchParams(
      filters.currentWeek
        ? {
            week: filters.currentWeek.toString(),
            year: filters.currentYear.toString(),
          }
        : {
            year: filters.currentYear.toString(),
            month: (filters.currentMonth + 1).toString(),
          }
    ).toString();
  }, [filters]);

  const loadData = useCallback(
    async () => {
      const data = (await fetch(`/posts?${params}`)).json();
      return data;
    },
    [filters, params]
  );

  const swr = useSWR(`/posts-${params}`, loadData, {
    refreshInterval: 3600000,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
  });

  const setFiltersWrapper = useCallback(
    (filters: {
      currentWeek: number;
      currentYear: number;
      currentMonth: number;
      display: 'week' | 'month';
    }) => {
      setFilters(filters);
      setInternalData([]);
      window.history.replaceState(
        null,
        '',
        `/launches?${
          filters.currentWeek
            ? `week=${filters.currentWeek}`
            : `month=${filters.currentMonth}`
        }&year=${filters.currentYear}`
      );
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
