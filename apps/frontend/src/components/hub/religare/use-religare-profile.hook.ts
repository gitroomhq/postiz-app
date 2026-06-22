import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import type { ReligareProfileDetail } from './use-religare-profiles.hook';

/** Um perfil Religare pelo id. */
export const useReligareProfile = (id: string | null) => {
  const fetch = useFetch();

  const load = useCallback(
    async (path: string) => {
      return (await fetch(path)).json() as Promise<ReligareProfileDetail>;
    },
    [fetch]
  );

  return useSWR<ReligareProfileDetail>(
    id ? `/hub/religare/profiles/${id}` : null,
    load,
    { revalidateOnFocus: false }
  );
};
