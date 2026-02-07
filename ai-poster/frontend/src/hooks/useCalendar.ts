import useSWR from 'swr';
import { swrFetcher } from './useFetch';
import { buildQueryString } from '@/lib/utils';
import type { PostDto } from '@ai-poster/shared';

interface CalendarFilters {
  campaignId?: string;
  integrationId?: string;
  status?: string;
}

interface CalendarResponse {
  posts: PostDto[];
}

export function useCalendar(
  start: string | undefined,
  end: string | undefined,
  filters: CalendarFilters = {}
) {
  const qs = buildQueryString({ start, end, ...filters });
  const key = start && end ? `/calendar${qs}` : null;

  const { data, error, isLoading, mutate } = useSWR<CalendarResponse>(
    key,
    swrFetcher
  );

  return {
    posts: data?.posts ?? [],
    error,
    isLoading,
    mutate,
  };
}
