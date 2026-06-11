import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export interface CrmProject {
  id: string;
  name: string;
  status: string;
  businessArea: string | null;
  toneOfVoice: string | null;
  createdAt: string;
}

export interface CrmContact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
}

export interface CrmInteraction {
  id: string;
  type: string;
  summary: string;
  userId: string;
  createdAt: string;
}

export interface CrmClientDetail {
  id: string;
  name: string;
  email: string | null;
  website: string | null;
  segment: string | null;
  status: string;
  notes: string | null;
  responsibleId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { projects: number; contacts: number; interactions: number };
  projects: CrmProject[];
  contacts: CrmContact[];
  interactions: CrmInteraction[];
}

export type ClientLoadError = { status: number; message: string };

export const useClient = (id: string) => {
  const fetch = useFetch();

  const load = useCallback(
    async (path: string): Promise<CrmClientDetail | null> => {
      let res: Response;
      try {
        res = await fetch(path);
      } catch (e) {
        const err: ClientLoadError = { status: 0, message: 'Sem conexão com o backend' };
        throw err;
      }
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const b = await res.json(); msg = b?.message ?? msg; } catch (_) {}
        const err: ClientLoadError = { status: res.status, message: msg };
        throw err;
      }
      const json = await res.json();
      if (!json?.id) {
        const err: ClientLoadError = { status: 200, message: 'Resposta inválida do servidor' };
        throw err;
      }
      return json;
    },
    [fetch]
  );

  return useSWR<CrmClientDetail, ClientLoadError>(`/hub/crm/clients/${id}`, load, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
};
