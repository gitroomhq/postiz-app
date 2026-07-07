import { apiFetch } from '@/src/api/client';
import type { MobileOrganization, MobileUser } from '@/src/api/auth.api';

type OrganizationMembership = MobileOrganization & {
  users?: Array<{
    disabled?: boolean;
    role?: string;
  }>;
};

export type MobileSelfResponse = MobileUser & {
  admin?: boolean;
  orgId: string;
  role?: string;
};

export function getSelf() {
  return apiFetch<MobileSelfResponse>('/user/self', {
    method: 'GET',
  });
}

export async function getOrganizations() {
  const organizations = await apiFetch<OrganizationMembership[]>('/user/organizations', {
    method: 'GET',
  });

  return organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    role: organization.users?.[0]?.role,
  }));
}
