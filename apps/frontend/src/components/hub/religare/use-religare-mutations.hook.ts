import { useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { mutate } from 'swr';
import type { IkigaiAnswers } from '@gitroom/helpers/utils/religare';
import type { ReligareContext } from './use-religare-context.hook';

export interface ReligareProfileFormData {
  expertId?: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  birthPlace: string;
  birthLat?: number;
  birthLng?: number;
  birthTz?: string;
}

export interface QuestionnairePayload {
  answers: {
    archetypes: Record<string, string>;
    vocational: Record<string, string>;
    ikigai: IkigaiAnswers;
  };
}

const revalidateProfiles = () =>
  mutate(
    (key) => typeof key === 'string' && key.startsWith('/hub/religare/profiles')
  );

export const useReligareMutations = () => {
  const fetch = useFetch();

  const createProfile = useCallback(
    async (data: ReligareProfileFormData) => {
      const res = await fetch('/hub/religare/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.message || 'Erro ao criar perfil Religare');
      }
      await revalidateProfiles();
      return res.json();
    },
    [fetch]
  );

  const updateProfile = useCallback(
    async (id: string, data: Partial<ReligareProfileFormData>) => {
      const res = await fetch(`/hub/religare/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao atualizar perfil');
      await mutate(`/hub/religare/profiles/${id}`);
      await revalidateProfiles();
      return res.json();
    },
    [fetch]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      const res = await fetch(`/hub/religare/profiles/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao excluir perfil');
      await revalidateProfiles();
      return res.json();
    },
    [fetch]
  );

  const submitQuestionnaire = useCallback(
    async (id: string, payload: QuestionnairePayload) => {
      const res = await fetch(`/hub/religare/profiles/${id}/questionnaire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erro ao processar questionário');
      await mutate(`/hub/religare/profiles/${id}`);
      await revalidateProfiles();
      return res.json();
    },
    [fetch]
  );

  const recomputeProfile = useCallback(
    async (id: string) => {
      const res = await fetch(`/hub/religare/profiles/${id}/recompute`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Erro ao recalcular a leitura');
      await mutate(`/hub/religare/profiles/${id}`);
      await revalidateProfiles();
      return res.json();
    },
    [fetch]
  );

  const setContext = useCallback(
    async (context: ReligareContext) => {
      const res = await fetch('/hub/religare/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      if (!res.ok) throw new Error('Erro ao mudar o modo');
      await mutate('/hub/religare/context');
      return res.json();
    },
    [fetch]
  );

  return {
    createProfile,
    updateProfile,
    deleteProfile,
    submitQuestionnaire,
    recomputeProfile,
    setContext,
  };
};
