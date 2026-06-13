import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useCallback } from 'react';
import useSWR from 'swr';

export interface IntegrationWithClient {
  id: string;
  name: string;
  picture: string;
  identifier: string;
  disabled: boolean;
  crmClientId: string | null;
}

export const useAllIntegrations = () => {
  const fetch = useFetch();

  const load = useCallback(async (path: string) => {
    return (await (await fetch(path)).json()).integrations as IntegrationWithClient[];
  }, []);

  return useSWR<IntegrationWithClient[]>('/integrations/list', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    fallbackData: [],
  });
};
