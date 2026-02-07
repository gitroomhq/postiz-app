import useSWR from 'swr';
import { swrFetcher } from './useFetch';
import type { Platform } from '@ai-poster/shared';

export interface IntegrationDto {
  id: string;
  organizationId: string;
  platform: Platform;
  displayName: string;
  accountName: string;
  accountId: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

interface IntegrationsResponse {
  integrations: IntegrationDto[];
}

export function useIntegrations() {
  const { data, error, isLoading, mutate } = useSWR<IntegrationsResponse>(
    '/integrations',
    swrFetcher
  );

  return {
    integrations: data?.integrations ?? [],
    error,
    isLoading,
    mutate,
  };
}
