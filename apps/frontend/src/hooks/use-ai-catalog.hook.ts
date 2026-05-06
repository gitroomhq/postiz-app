'use client';

import { useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import type { AiKind } from '@gitroom/frontend/hooks/use-ai-credentials.hook';

export interface CatalogModel {
  id: string;
  displayName: string;
  provider: string;
  kind: AiKind;
  contextLength?: number;
  inputModalities?: string[];
  outputModalities?: string[];
  supportedParameters?: string[];
  imageConfig?: {
    aspectRatios?: string[];
    sizes?: string[];
  };
  pricing?: {
    promptUSDPerMillion?: number;
    completionUSDPerMillion?: number;
    imageUSDPerImage?: number;
  };
}

export interface CatalogResponse {
  provider: string;
  kind: AiKind;
  fetchedAt: string;
  models: CatalogModel[];
}

const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  revalidateOnMount: true,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  dedupingInterval: 60_000,
};

/**
 * Busca o catalogo de modelos para um kind+provider especifico.
 * Backend cacheia em Redis por 1h; aqui SWR cacheia na sessao.
 */
export const useAiCatalog = (kind: AiKind, provider: string | null) => {
  const fetch = useFetch();

  const load = useCallback(async () => {
    if (!provider) return null;
    const res = await fetch(
      `/ai/catalog/${kind}?provider=${encodeURIComponent(provider)}`
    );
    if (!res.ok) return null;
    return res.json();
  }, [kind, provider]);

  return useSWR<CatalogResponse | null>(
    kind && provider ? `ai-catalog-${kind}-${provider}` : null,
    load,
    swrOptions
  );
};
