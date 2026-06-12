import useSWR, { mutate } from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useCallback } from 'react';

export interface ContentItem {
  id: string;
  title: string;
  body?: string;
  mediaUrls?: string[];
  type: string;
  status: string;
  position: number;
  scheduledAt?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  events?: ContentEvent[];
}

export interface ContentEvent {
  id: string;
  type: string;
  text?: string;
  byGuest: boolean;
  createdAt: string;
}

export function useContentItems(projectId: string) {
  const fetch = useFetch();
  return useSWR<ContentItem[]>(
    projectId ? `/hub/crm/projects/${projectId}/content` : null,
    (url: string) => fetch(url).then((r) => r.json()),
  );
}

export function useContentMutations(projectId: string) {
  const fetch = useFetch();
  const key = `/hub/crm/projects/${projectId}/content`;

  const createItem = useCallback(
    async (data: { title: string; body?: string; type?: string; scheduledAt?: string }) => {
      const res = await fetch(key, { method: 'POST', body: JSON.stringify(data) });
      await mutate(key);
      return res.json();
    },
    [fetch, key],
  );

  const updateItem = useCallback(
    async (id: string, data: Partial<ContentItem>) => {
      const res = await fetch(`${key}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      await mutate(key);
      return res.json();
    },
    [fetch, key],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await fetch(`${key}/${id}`, { method: 'DELETE' });
      await mutate(key);
    },
    [fetch, key],
  );

  const addComment = useCallback(
    async (id: string, text: string) => {
      const res = await fetch(`${key}/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) });
      await mutate(key);
      return res.json();
    },
    [fetch, key],
  );

  const generatePortalLink = useCallback(async () => {
    const res = await fetch(`${key}/portal-link`, { method: 'POST' });
    return res.json() as Promise<{ token: string }>;
  }, [fetch, key]);

  return { createItem, updateItem, deleteItem, addComment, generatePortalLink };
}
