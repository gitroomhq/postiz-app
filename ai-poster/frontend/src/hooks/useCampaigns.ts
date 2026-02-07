import useSWR from 'swr';
import { swrFetcher } from './useFetch';
import type { CampaignDto } from '@ai-poster/shared';

interface CampaignsResponse {
  campaigns: CampaignDto[];
}

export function useCampaigns() {
  const { data, error, isLoading, mutate } = useSWR<CampaignsResponse>(
    '/campaigns',
    swrFetcher
  );

  return {
    campaigns: data?.campaigns ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useCampaign(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<CampaignDto>(
    id ? `/campaigns/${id}` : null,
    swrFetcher
  );

  return {
    campaign: data,
    error,
    isLoading,
    mutate,
  };
}
