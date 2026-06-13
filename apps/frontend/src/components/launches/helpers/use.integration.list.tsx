'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useCallback, useContext } from 'react';
import useSWR from 'swr';
import { VolatisClientContext } from '@gitroom/frontend/components/hub/volatis-client-context';

export const useIntegrationList = () => {
  const fetch = useFetch();
  const { selectedClientId } = useContext(VolatisClientContext);

  const key = selectedClientId
    ? `/integrations/list?clientId=${selectedClientId}`
    : '/integrations/list';

  const load = useCallback(async (path: string) => {
    return (await (await fetch(path)).json()).integrations;
  }, []);

  return useSWR(key, load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });
};
