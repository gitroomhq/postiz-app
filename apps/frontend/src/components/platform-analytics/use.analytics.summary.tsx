'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export type AnalyticsSummaryResponse = {
  syncing: boolean;
  date: number;
  posts: number;
  reactions: number | null;
  comments: number | null;
  impressions: number | null;
  channels: Array<{
    integrationId: string;
    platform: string;
    channelName: string;
    posts: number;
    impressions: number | null;
  }>;
  weekdays: number[];
  engagementMix: {
    reactions: number | null;
    comments: number | null;
  } | null;
};

export const useAnalyticsSummary = (params: {
  date: number;
  integrationIds?: string;
  enabled: boolean;
}) => {
  const fetch = useFetch();
  const search = new URLSearchParams({
    date: String(params.date),
  });
  if (params.integrationIds) {
    search.set('integrationIds', params.integrationIds);
  }
  const query = search.toString();
  const key = params.enabled ? `/analytics/summary?${query}` : null;

  const load = useCallback(async () => {
    if (!params.enabled) {
      return null;
    }
    const response = await fetch(`/analytics/summary?${query}`);
    if (!response.ok) {
      throw new Error('Could not load analytics summary');
    }
    return (await response.json()) as AnalyticsSummaryResponse;
  }, [fetch, params.enabled, query]);

  return useSWR(key, load, {
    refreshInterval: (latest) => (latest?.syncing ? 5000 : 0),
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
};
