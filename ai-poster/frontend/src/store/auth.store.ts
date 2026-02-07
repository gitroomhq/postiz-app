import { create } from 'zustand';
import type { UserDto, OrganizationDto } from '@ai-poster/shared';

interface AuthState {
  user: UserDto | null;
  organization: OrganizationDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserDto, organization: OrganizationDto) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user, organization) =>
    set({ user, organization, isAuthenticated: true, isLoading: false }),
  clearUser: () =>
    set({ user: null, organization: null, isAuthenticated: false, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
