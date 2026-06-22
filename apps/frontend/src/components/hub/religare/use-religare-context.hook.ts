import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export type ReligareContext = 'agency' | 'therapy';

/** Modo do Religare na organização (agência/terapeuta) — define o vocabulário. */
export const useReligareContext = () => {
  const fetch = useFetch();

  const load = useCallback(
    async (path: string) => {
      const res = await (await fetch(path)).json();
      return (res.context ?? 'agency') as ReligareContext;
    },
    [fetch]
  );

  return useSWR<ReligareContext>('/hub/religare/context', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    fallbackData: 'agency',
  });
};
