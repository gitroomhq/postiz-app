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

export const useClient = (id: string) => {
  const fetch = useFetch();

  const load = useCallback(
    async (path: string): Promise<CrmClientDetail> => {
      const res = await fetch(path);
      return res.json();
    },
    [fetch]
  );

  return useSWR<CrmClientDetail>(`/hub/crm/clients/${id}`, load, {
    revalidateOnFocus: false,
  });
};
