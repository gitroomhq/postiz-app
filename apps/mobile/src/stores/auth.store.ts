import { useEffect } from 'react';
import { create } from 'zustand';

import { ApiError } from '@/src/api/client';
import { loginMobile } from '@/src/api/auth.api';
import type { MobileLoginRequest, MobileOrganization, MobileUser } from '@/src/api/auth.api';
import { deletePushToken } from '@/src/api/mobile-push.api';
import { getOrganizations, getSelf } from '@/src/api/user.api';
import { queryClient } from '@/src/providers/query-client';
import {
  clearAuthSession,
  clearRegisteredPushToken,
  getAuthToken,
  getRegisteredPushToken,
  getSelectedOrgId,
  saveAuthToken,
  saveSelectedOrgId,
} from '@/src/services/secure-storage.service';

type AuthStatus = 'bootstrapping' | 'anonymous' | 'authenticated';

type AuthState = {
  error?: string;
  organization?: MobileOrganization;
  organizationId?: string;
  organizations: MobileOrganization[];
  status: AuthStatus;
  token?: string;
  user?: MobileUser;
  bootstrap: () => Promise<void>;
  login: (input: MobileLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  setOrganization: (organization: MobileOrganization) => Promise<void>;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to complete request.';
}

export const useAuthStore = create<AuthState>((set) => ({
  organizations: [],
  status: 'bootstrapping',
  async bootstrap() {
    const [token, organizationId] = await Promise.all([getAuthToken(), getSelectedOrgId()]);

    if (!token) {
      set({
        organization: undefined,
        organizationId: undefined,
        organizations: [],
        status: 'anonymous',
        token: undefined,
        user: undefined,
      });
      return;
    }

    try {
      const [self, organizations] = await Promise.all([getSelf(), getOrganizations()]);
      const selectedOrganization =
        organizations.find((organization) => organization.id === self.orgId) ||
        organizations.find((organization) => organization.id === organizationId) ||
        organizations[0];

      if (!selectedOrganization) {
        await clearAuthSession();
        set({
          organization: undefined,
          organizationId: undefined,
          organizations: [],
          status: 'anonymous',
          token: undefined,
          user: undefined,
        });
        return;
      }

      await saveSelectedOrgId(selectedOrganization.id);

      set({
        organization: selectedOrganization,
        organizationId: selectedOrganization.id,
        organizations,
        status: 'authenticated',
        token,
        user: {
          email: self.email,
          id: self.id,
        },
      });
    } catch (error) {
      await clearAuthSession();
      set({
        error: getErrorMessage(error),
        organization: undefined,
        organizationId: undefined,
        organizations: [],
        status: 'anonymous',
        token: undefined,
        user: undefined,
      });
    }
  },
  async login(input) {
    set({ error: undefined, status: 'bootstrapping' });

    try {
      const response = await loginMobile(input);

      if (!response.login) {
        set({
          error: response.activationRequired
            ? 'Please activate your account before signing in.'
            : response.message ?? 'Unable to sign in.',
          status: 'anonymous',
        });
        return;
      }

      await Promise.all([saveAuthToken(response.token), saveSelectedOrgId(response.organizationId)]);
      const organizations = await getOrganizations().catch(() => [response.organization]);
      const selectedOrganization =
        organizations.find((organization) => organization.id === response.organizationId) || response.organization;

      set({
        error: undefined,
        organization: selectedOrganization,
        organizationId: selectedOrganization.id,
        organizations,
        status: 'authenticated',
        token: response.token,
        user: response.user,
      });
    } catch (error) {
      set({ error: getErrorMessage(error), status: 'anonymous' });
    }
  },
  async logout() {
    const pushToken = await getRegisteredPushToken().catch(() => null);

    if (pushToken) {
      await deletePushToken(pushToken).catch(() => {});
      await clearRegisteredPushToken().catch(() => {});
    }

    await clearAuthSession();
    set({
      error: undefined,
      organization: undefined,
      organizationId: undefined,
      organizations: [],
      status: 'anonymous',
      token: undefined,
      user: undefined,
    });
  },
  async setOrganization(organization) {
    await saveSelectedOrgId(organization.id);
    set({ organization, organizationId: organization.id });
    await queryClient.invalidateQueries();
  },
}));

export function useAuthBootstrap() {
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);
}
