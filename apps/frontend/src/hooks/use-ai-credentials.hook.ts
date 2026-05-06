'use client';

import { useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';

export type AiKind = 'TEXT' | 'IMAGE' | 'VIDEO' | 'WEB_SEARCH';
export type AiScope = 'WORKSPACE' | 'PROFILE';

export interface AiCredentialSummary {
  scope: AiScope;
  kind: AiKind;
  profileId: string | null;
  provider: string;
  model: string | null;
  fallbackModel: string | null;
  apiKey: string;
  options: Record<string, unknown> | null;
  shareDefault: boolean;
  lastTestStatus: string | null;
  lastUsedAt: string | null;
  updatedAt: string;
}

const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  revalidateOnMount: true,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  dedupingInterval: 30_000,
};

/**
 * Lista todas as credenciais de IA configuradas no workspace.
 */
export const useAiCredentialsList = () => {
  const fetch = useFetch();

  const load = useCallback(async () => {
    const res = await fetch('/ai/credentials');
    if (!res.ok) return [];
    return res.json();
  }, []);

  return useSWR<AiCredentialSummary[]>(
    'ai-credentials-list',
    load,
    swrOptions
  );
};

/**
 * Busca a credencial de um kind no scope correspondente:
 * - sem profileId → workspace default
 * - com profileId de perfil secundario → row PROFILE
 * - com profileId de perfil default → workspace (backend resolve)
 *
 * Retorna null quando nao configurado para aquele scope.
 */
export const useAiCredential = (kind: AiKind, profileId?: string | null) => {
  const fetch = useFetch();

  const load = useCallback(async () => {
    const url = profileId
      ? `/ai/credentials/${kind}?profileId=${encodeURIComponent(profileId)}`
      : `/ai/credentials/${kind}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data ?? null;
  }, [kind, profileId]);

  const cacheKey = kind
    ? profileId
      ? `ai-credential-${kind}-profile-${profileId}`
      : `ai-credential-${kind}-workspace`
    : null;

  return useSWR<AiCredentialSummary | null>(cacheKey, load, swrOptions);
};
