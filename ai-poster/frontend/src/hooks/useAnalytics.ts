import useSWR from 'swr';
import { swrFetcher } from './useFetch';
import { buildQueryString } from '@/lib/utils';

interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  campaignId?: string;
  integrationId?: string;
}

export interface AnalyticsOverview {
  totalPosts: number;
  totalImpressions: number;
  totalEngagement: number;
  totalClicks: number;
  engagementRate: number;
  postsThisWeek: number;
  pendingApprovals: number;
}

export interface PostAnalytics {
  id: string;
  postId: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement: number;
  platformUrl?: string;
}

export interface EngagementDataPoint {
  date: string;
  impressions: number;
  engagement: number;
  clicks: number;
}

interface AnalyticsResponse {
  overview: AnalyticsOverview;
  topPosts: PostAnalytics[];
  engagementTrend: EngagementDataPoint[];
}

export function useAnalytics(filters: AnalyticsFilters = {}) {
  const qs = buildQueryString(filters);

  const { data, error, isLoading } = useSWR<AnalyticsResponse>(
    `/analytics${qs}`,
    swrFetcher
  );

  return {
    overview: data?.overview ?? null,
    topPosts: data?.topPosts ?? [],
    engagementTrend: data?.engagementTrend ?? [],
    error,
    isLoading,
  };
}
