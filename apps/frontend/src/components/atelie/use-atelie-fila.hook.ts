import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export interface ServiceOffering {
  id: string;
  slug: string;
  name: string;
  category: string;
  deliveryMode: string;
}

export interface ServiceRequestEvent {
  id: string;
  type: string;
  text?: string;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  projectId: string;
  offeringId: string;
  briefing: Record<string, unknown>;
  scopeLevel: string;
  status: string;
  priceRange?: string;
  leadTimeRange?: string;
  contextPackComplete: boolean;
  hasReligareProfile: boolean;
  deliverableUrl?: string;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string };
  offering: ServiceOffering;
  events?: ServiceRequestEvent[];
}

const FILA_KEY = '/hub/atelie/fila';

export function useAtelieOfferings() {
  const fetch = useFetch();
  return useSWR<ServiceOffering[]>('/hub/atelie/offerings', (url: string) => fetch(url).then((r) => r.json()));
}

export function useAtelieFila() {
  const fetch = useFetch();
  return useSWR<ServiceRequest[]>(FILA_KEY, (url: string) => fetch(url).then((r) => r.json()));
}

export function useAtelieMutations() {
  const fetch = useFetch();

  const updateStatus = useCallback(
    async (id: string, status: string) => {
      const res = await fetch(`${FILA_KEY}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await mutate(FILA_KEY);
      return res.json();
    },
    [fetch],
  );

  return { updateStatus };
}
