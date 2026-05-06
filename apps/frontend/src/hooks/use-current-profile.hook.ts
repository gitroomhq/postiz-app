'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';

export interface CurrentProfile {
  id: string;
  name: string;
  isDefault: boolean;
}

interface ProfileRow {
  id: string;
  name: string;
  isDefault: boolean;
}

/**
 * Retorna o profile atual selecionado no header do usuario,
 * com `isDefault` resolvido via SWR de /user/profiles.
 *
 * Reusamos a mesma SWR key 'profiles' que ja e populada pelo
 * ProfileSelector — assim nao duplicamos chamadas.
 */
export const useCurrentProfile = (): {
  profile: CurrentProfile | null;
  isLoading: boolean;
} => {
  const fetch = useFetch();
  const user = useUser();

  const load = useCallback(async () => {
    return await (await fetch('/user/profiles')).json();
  }, []);

  const { data, isLoading } = useSWR<ProfileRow[]>('profiles', load, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    revalidateOnReconnect: false,
  });

  const profile = useMemo<CurrentProfile | null>(() => {
    if (!user?.profileId || !data?.length) return null;
    const row = data.find((p) => p.id === user.profileId);
    if (!row) return null;
    return { id: row.id, name: row.name, isDefault: row.isDefault };
  }, [data, user?.profileId]);

  return { profile, isLoading };
};
