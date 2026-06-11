import { useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { mutate } from 'swr';

export interface ClientFormData {
  name: string;
  email?: string;
  website?: string;
  segment?: string;
  status?: string;
  notes?: string;
}

export interface ContactFormData {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

export interface InteractionFormData {
  type: string;
  summary: string;
}

export const useCrmMutations = () => {
  const fetch = useFetch();

  const createClient = useCallback(
    async (data: ClientFormData) => {
      const res = await fetch('/hub/crm/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao criar cliente');
      await mutate((key: string) => typeof key === 'string' && key.startsWith('/hub/crm/clients'));
      return res.json();
    },
    [fetch]
  );

  const updateClient = useCallback(
    async (id: string, data: ClientFormData) => {
      const res = await fetch(`/hub/crm/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao atualizar cliente');
      await mutate(`/hub/crm/clients/${id}`);
      await mutate((key: string) => typeof key === 'string' && key.startsWith('/hub/crm/clients?'));
      return res.json();
    },
    [fetch]
  );

  const createContact = useCallback(
    async (clientId: string, data: ContactFormData) => {
      const res = await fetch(`/hub/crm/clients/${clientId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao criar contato');
      await mutate(`/hub/crm/clients/${clientId}`);
      return res.json();
    },
    [fetch]
  );

  const createInteraction = useCallback(
    async (clientId: string, data: InteractionFormData) => {
      const res = await fetch(`/hub/crm/clients/${clientId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao criar interação');
      await mutate(`/hub/crm/clients/${clientId}`);
      return res.json();
    },
    [fetch]
  );

  return { createClient, updateClient, createContact, createInteraction };
};
