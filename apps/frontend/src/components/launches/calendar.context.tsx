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

const CalendarContext = createContext({
  currentWeek: dayjs().week(),
  currentYear: dayjs().year(),
  comments: [] as Array<{ date: string; total: number }>,
  integrations: [] as Integrations[],
  trendings: [] as string[],
  posts: [] as Array<Post & { integration: Integration }>,
  setFilters: (filters: { currentWeek: number; currentYear: number }) => {},
  changeDate: (id: string, date: dayjs.Dayjs) => {},
});

export interface Integrations {
  name: string;
  id: string;
  identifier: string;
  type: string;
  picture: string;
}
export const CalendarWeekProvider: FC<{
  children: ReactNode;
  integrations: Integrations[];
}> = ({ children, integrations }) => {
  const fetch = useFetch();
  const [internalData, setInternalData] = useState([] as any[]);
  const [trendings, setTrendings] = useState<string[]>([]);
  const { mutate } = useSWRConfig();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setTrendings(await (await fetch('/posts/predict-trending')).json());
    })();
  }, []);

  const [filters, setFilters] = useState({
    currentWeek: +(searchParams.get('week') || dayjs().week()),
    currentYear: +(searchParams.get('year') || dayjs().year()),
  });

  const setFiltersWrapper = useCallback(
    (filters: { currentWeek: number; currentYear: number }) => {
      setFilters(filters);
      router.replace(
        `/launches?week=${filters.currentWeek}&year=${filters.currentYear}`
      );
      setTimeout(() => {
        mutate('/posts');
      });
    },
    [filters]
  );

  const params = useMemo(() => {
    return new URLSearchParams({
      week: filters.currentWeek.toString(),
      year: filters.currentYear.toString(),
    }).toString();
  }, [filters]);

  const loadData = useCallback(
    async (url: string) => {
      const data = (await fetch(`${url}?${params}`)).json();
      return data;
    },
    [filters]
  );

  const swr = useSWR(`/posts`, loadData, {
    refreshInterval: 3600000,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
  });
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
