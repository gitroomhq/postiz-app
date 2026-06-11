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
  items: CrmClient[];
  total: number;
  page: number;
}

export const PAGE_SIZE = 20;

export const useClients = (params: {
  search?: string;
  status?: string;
  page?: number;
}) => {
  const fetch = useFetch();

  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  // UI is 1-based; backend is 0-based
  if (params.page && params.page > 1) qs.set('page', String(params.page - 1));

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
