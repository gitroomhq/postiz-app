import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import type { ReligareDNA } from '@gitroom/helpers/utils/religare';

export interface CrmExpert {
  id: string;
  name: string;
  role: string | null;
  avatarUrl: string | null;
  handle: string | null;
  bio: string | null;
  toneOfVoice: string | null;
  audience: string | null;
  keywords: string | null;
  dna: string | null;
  createdAt: string;
  updatedAt: string;
  clients?: { client: { id: string; name: string } }[];
  /** Religare reading (1:1), when this expert has one — feeds the briefing. */
  religareProfile?: { dna: ReligareDNA | null; status: string } | null;
}

/** Todos os experts da organização (N:N — não filtrado por marca). */
export const useExperts = () => {
  const fetch = useFetch();

  const load = useCallback(async (path: string) => {
    return (await fetch(path)).json() as Promise<CrmExpert[]>;
  }, [fetch]);

  return useSWR<CrmExpert[]>('/hub/crm/experts', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    fallbackData: [],
  });
};

/** Experts vinculados a UMA marca (client) — para o seletor no editor/config. */
export const useClientExperts = (clientId: string | null) => {
  const fetch = useFetch();

  const load = useCallback(async (path: string) => {
    return (await fetch(path)).json() as Promise<CrmExpert[]>;
  }, [fetch]);

  return useSWR<CrmExpert[]>(
    clientId ? `/hub/crm/clients/${clientId}/experts` : null,
    load,
    { revalidateOnFocus: false, fallbackData: [] }
  );
};
