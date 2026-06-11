import { useCallback } from 'react';
import useSWR from 'swr';
import { mutate } from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export interface SocialHandles { instagram?: string; tiktok?: string; linkedin?: string; youtube?: string; facebook?: string; x?: string; pinterest?: string; threads?: string }
export interface Persona { name?: string; pains?: string[]; desires?: string[] }

export interface ProjectDetail {
  id: string;
  name: string;
  status: string;
  businessArea: string | null;
  toneOfVoice: string | null;
  slogan: string | null;
  website: string | null;
  bioLink: string | null;
  productsServices: string | null;
  cta1: string | null;
  cta2: string | null;
  cta3: string | null;
  briefing: string | null;
  locale: string;
  timezone: string;
  socialHandles: SocialHandles | null;
  persona: Persona | null;
  createdAt: string;
  clientId: string;
  ownerId: string;
  client: { id: string; name: string };
}

export const useProject = (id: string) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string): Promise<ProjectDetail | null> => {
    const res = await fetch(path);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.id ? json : null;
  }, [fetch]);
  return useSWR<ProjectDetail | null>(`/hub/crm/projects/${id}`, load, { revalidateOnFocus: false });
};

export const useProjectMutations = () => {
  const fetch = useFetch();

  const createProject = useCallback(async (data: object) => {
    const res = await fetch('/hub/crm/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erro ao criar projeto');
    await mutate((key: string) => typeof key === 'string' && key.startsWith('/hub/crm/projects'));
    return res.json();
  }, [fetch]);

  const updateProject = useCallback(async (id: string, data: object) => {
    const res = await fetch(`/hub/crm/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erro ao atualizar projeto');
    await mutate(`/hub/crm/projects/${id}`);
    await mutate((key: string) => typeof key === 'string' && key.startsWith('/hub/crm/projects?'));
    return res.json();
  }, [fetch]);

  return { createProject, updateProject };
};
