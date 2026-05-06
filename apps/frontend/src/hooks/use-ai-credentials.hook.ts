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
 * Busca a credencial workspace-default de um kind especifico.
 * Retorna null quando nao configurado.
 */
export const useAiCredential = (kind: AiKind) => {
  const fetch = useFetch();

  const load = useCallback(async () => {
    const res = await fetch(`/ai/credentials/${kind}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data ?? null;
  }, [kind]);

  return useSWR<AiCredentialSummary | null>(
    kind ? `ai-credential-${kind}` : null,
    load,
    swrOptions
  );
};
