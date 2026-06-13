import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { CrmClient } from './use-clients.hook';

export const useClientsAll = () => {
  const fetch = useFetch();

  const load = useCallback(async (path: string) => {
    const res = await (await fetch(path)).json();
    return (res.items ?? []) as CrmClient[];
  }, []);

  return useSWR<CrmClient[]>('/hub/crm/clients', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    fallbackData: [],
  });
};
