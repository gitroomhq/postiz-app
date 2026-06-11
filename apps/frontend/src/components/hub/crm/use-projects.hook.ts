import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export interface ProjectListItem {
  id: string;
  name: string;
  status: string;
  businessArea: string | null;
  toneOfVoice: string | null;
  slogan: string | null;
  createdAt: string;
  clientId: string;
  ownerId: string;
  client: { id: string; name: string };
}

export interface ProjectsPage {
  items: ProjectListItem[];
  total: number;
  page: number;
}

export const useProjects = (params: { clientId?: string; status?: string; page?: number } = {}) => {
  const fetch = useFetch();
  const qs = new URLSearchParams();
  if (params.clientId) qs.set('clientId', params.clientId);
  if (params.status)   qs.set('status', params.status);
  if (params.page && params.page > 1) qs.set('page', String(params.page - 1));
  const key = `/hub/crm/projects?${qs.toString()}`;
  const load = useCallback(async (path: string): Promise<ProjectsPage> => {
    const res = await fetch(path);
    if (!res.ok) return { items: [], total: 0, page: 0 };
    return res.json();
  }, [fetch]);
  return useSWR<ProjectsPage>(key, load, { revalidateOnFocus: false });
};
