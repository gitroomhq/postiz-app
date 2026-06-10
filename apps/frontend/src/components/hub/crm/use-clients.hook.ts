import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export interface CrmClient {
  id: string;
  name: string;
  email: string | null;
  website: string | null;
  segment: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    projects: number;
    contacts: number;
  };
}

export interface ClientsPage {
  clients: CrmClient[];
  total: number;
  page: number;
  perPage: number;
}

export const useClients = (params: {
  search?: string;
  status?: string;
  page?: number;
}) => {
  const fetch = useFetch();

  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  if (params.page) qs.set('page', String(params.page));

  const key = `/hub/crm/clients?${qs.toString()}`;

  const load = useCallback(
    async (path: string): Promise<ClientsPage> => {
      const res = await fetch(path);
      return res.json();
    },
    [fetch]
  );

  return useSWR<ClientsPage>(key, load, {
    revalidateOnFocus: false,
  });
};
