import useSWR from 'swr';
import { swrFetcher } from './useFetch';
import { buildQueryString } from '@/lib/utils';

export interface MediaDto {
  id: string;
  organizationId: string;
  path: string;
  type: 'image' | 'video';
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  altText?: string;
  createdAt: string;
}

interface MediaResponse {
  media: MediaDto[];
  total: number;
  page: number;
  totalPages: number;
}

export function useMedia(page: number = 1, type?: string) {
  const qs = buildQueryString({ page, type, limit: 24 });

  const { data, error, isLoading, mutate } = useSWR<MediaResponse>(
    `/media${qs}`,
    swrFetcher
  );

  return {
    media: data?.media ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    error,
    isLoading,
    mutate,
  };
}
