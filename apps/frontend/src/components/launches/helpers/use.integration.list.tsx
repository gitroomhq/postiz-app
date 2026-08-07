'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useCallback } from 'react';
import useSWR from 'swr';
import { sortIntegrationsByProviderImportance } from '@gitroom/frontend/components/launches/helpers/sort.integrations';

export const useIntegrationList = () => {
  const fetch = useFetch();

  const load = useCallback(async (path: string): Promise<any[]> => {
    const integrations = (await (await fetch(path)).json()).integrations;
    return sortIntegrationsByProviderImportance(
      Array.isArray(integrations) ? integrations : []
    );
  }, [fetch]);

  return useSWR('/integrations/list', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });
};