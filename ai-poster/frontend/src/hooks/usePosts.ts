import useSWR from 'swr';
import { swrFetcher } from './useFetch';
import { buildQueryString } from '@/lib/utils';
import type { PostDto } from '@ai-poster/shared';

interface PostsFilters {
  state?: string;
  campaignId?: string;
  integrationId?: string;
  page?: number;
  limit?: number;
}

interface PostsResponse {
  posts: PostDto[];
  total: number;
  page: number;
  totalPages: number;
}

interface PostVersionsResponse {
  versions: PostDto[];
}

export function usePosts(filters: PostsFilters = {}) {
  const qs = buildQueryString(filters);
  const { data, error, isLoading, mutate } = useSWR<PostsResponse>(
    `/posts${qs}`,
    swrFetcher
  );

  return {
    posts: data?.posts ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    error,
    isLoading,
    mutate,
  };
}

export function usePost(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<PostDto>(
    id ? `/posts/${id}` : null,
    swrFetcher
  );

  return {
    post: data,
    error,
    isLoading,
    mutate,
  };
}

export function usePostVersions(id: string | undefined) {
  const { data, error, isLoading } = useSWR<PostVersionsResponse>(
    id ? `/posts/${id}/versions` : null,
    swrFetcher
  );

  return {
    versions: data?.versions ?? [],
    error,
    isLoading,
  };
}
