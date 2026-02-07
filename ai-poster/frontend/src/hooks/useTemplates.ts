import useSWR from 'swr';
import { swrFetcher } from './useFetch';
import type { TemplateDto } from '@ai-poster/shared';

interface TemplatesResponse {
  templates: TemplateDto[];
}

export function useTemplates() {
  const { data, error, isLoading, mutate } = useSWR<TemplatesResponse>(
    '/templates',
    swrFetcher
  );

  return {
    templates: data?.templates ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useTemplate(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<TemplateDto>(
    id ? `/templates/${id}` : null,
    swrFetcher
  );

  return {
    template: data,
    error,
    isLoading,
    mutate,
  };
}
