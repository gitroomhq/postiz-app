import useSWR from 'swr';
import { useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { customFetch, swrFetcher } from './useFetch';
import type {
  AuthResponse,
  LoginDto,
  RegisterDto,
} from '@ai-poster/shared';

export function useAuth() {
  const { setUser, clearUser, user, organization, isAuthenticated } =
    useAuthStore();

  const { mutate, isLoading } = useSWR<AuthResponse>(
    '/auth/me',
    swrFetcher,
    {
      onSuccess: (data) => {
        if (data?.user) {
          setUser(data.user, data.organization);
        }
      },
      onError: () => {
        clearUser();
      },
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const login = useCallback(
    async (dto: LoginDto) => {
      const data = await customFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      setUser(data.user, data.organization);
      await mutate(data, false);
      return data;
    },
    [setUser, mutate]
  );

  const register = useCallback(
    async (dto: RegisterDto) => {
      const data = await customFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      setUser(data.user, data.organization);
      await mutate(data, false);
      return data;
    },
    [setUser, mutate]
  );

  const logout = useCallback(async () => {
    await customFetch('/auth/logout', { method: 'POST' });
    clearUser();
    await mutate(undefined, false);
  }, [clearUser, mutate]);

  return {
    user,
    organization,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };
}
