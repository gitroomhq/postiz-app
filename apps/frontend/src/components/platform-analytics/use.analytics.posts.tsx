'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export type AnalyticsPostRow = {
  id: string;
  group: string;
  content: string;
  thumbnail: string | null;
  publishDate: string;
  releaseURL: string | null;
  integrationId: string;
  platform: string;
  channelName: string;
  channelPicture: string | null;
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  engagementRate: number | null;
};

export type AnalyticsPostsResponse = {
  syncing: boolean;
  date: number;
  total: number;
  page: number;
  limit: number;
  columns: {
    comments: boolean;
    reactions: boolean;
    impressions: boolean;
    engagement: boolean;
  };
  posts: AnalyticsPostRow[];
  top: AnalyticsPostRow[];
  topReactions?: AnalyticsPostRow[];
  topComments?: AnalyticsPostRow[];
};

export const useAnalyticsPosts = (params: {
  date: number;
  integrationIds?: string;
  sort: string;
  dir: string;
  page: number;
  enabled: boolean;
}) => {
  const fetch = useFetch();
  const search = new URLSearchParams({
    date: String(params.date),
    sort: params.sort,
    dir: params.dir,
    page: String(params.page),
    limit: '20',
  });
  if (params.integrationIds) {
    search.set('integrationIds', params.integrationIds);
  }
  const query = search.toString();
  const key = params.enabled ? `/analytics/posts?${query}` : null;

  const load = useCallback(async () => {
    if (!params.enabled) {
      return null;
    }
    const response = await fetch(`/analytics/posts?${query}`);
    if (!response.ok) {
      throw new Error('Could not load post analytics');
    }
    return (await response.json()) as AnalyticsPostsResponse;
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
