/**
 * Mapped Out role model (Option B).
 *
 * The Postiz Prisma enum stays `SUPERADMIN | ADMIN | USER | CLIENT` (no risky
 * enum rename / no data migration — see docs/MAPPED_OUT_UPGRADE_AUDIT.md §17).
 * The PRODUCT presents and enforces three internal staff roles plus the
 * DBU-Portal-owned CLIENT role, mapped 1:1 on top of the stored enum:
 *
 *   SUPERADMIN  <->  SUPER_ADMIN     global platform owner (agency-wide)
 *   ADMIN       <->  AGENCY_ADMIN    agency operations (agency-wide data)
 *   USER        <->  ACCOUNT_MANAGER the only operational role (assignment-scoped)
 *   CLIENT      <->  CLIENT          DBU Client Portal — untouched
 *
 * Job titles (Social Media Manager, Designer, Copywriter, Analyst) are labels,
 * NOT roles: everyone operational is an ACCOUNT_MANAGER scoped to explicit
 * clients + social accounts.
 *
 * Kept as string-literal comparisons so this stays pure/dependency-free and
 * unit-testable without the Prisma runtime.
 */

export type InternalRole = 'SUPERADMIN' | 'ADMIN' | 'USER' | 'CLIENT';
export type ProductRole =
  | 'SUPER_ADMIN'
  | 'AGENCY_ADMIN'
  | 'ACCOUNT_MANAGER'
  | 'CLIENT';

const INTERNAL_TO_PRODUCT: Record<InternalRole, ProductRole> = {
  SUPERADMIN: 'SUPER_ADMIN',
  ADMIN: 'AGENCY_ADMIN',
  USER: 'ACCOUNT_MANAGER',
  CLIENT: 'CLIENT',
};

const PRODUCT_TO_INTERNAL: Record<ProductRole, InternalRole> = {
  SUPER_ADMIN: 'SUPERADMIN',
  AGENCY_ADMIN: 'ADMIN',
  ACCOUNT_MANAGER: 'USER',
  CLIENT: 'CLIENT',
};

export const PRODUCT_ROLE_LABELS: Record<ProductRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  AGENCY_ADMIN: 'Agency Admin',
  ACCOUNT_MANAGER: 'Account Manager',
  CLIENT: 'Client',
};

/** Roles assignable to staff in the invite/team UI. CLIENT is excluded — it is
 *  owned by the DBU Client Portal and must never be created inside Mapped Out. */
export const ASSIGNABLE_PRODUCT_ROLES: ProductRole[] = [
  'SUPER_ADMIN',
  'AGENCY_ADMIN',
  'ACCOUNT_MANAGER',
];

export function toProductRole(
  role: string | null | undefined
): ProductRole | null {
  if (!role) return null;
  return INTERNAL_TO_PRODUCT[role as InternalRole] ?? null;
}

export function toInternalRole(
  role: string | null | undefined
): InternalRole | null {
  if (!role) return null;
  // Accept either a product role or an already-internal role (idempotent).
  if ((PRODUCT_TO_INTERNAL as Record<string, InternalRole>)[role]) {
    return PRODUCT_TO_INTERNAL[role as ProductRole];
  }
  if ((INTERNAL_TO_PRODUCT as Record<string, ProductRole>)[role]) {
    return role as InternalRole;
  }
  return null;
}

export function productRoleLabel(role: string | null | undefined): string {
  const pr = toProductRole(role);
  return pr ? PRODUCT_ROLE_LABELS[pr] : '';
}

/**
 * Agency-wide data access = SUPER_ADMIN or AGENCY_ADMIN (internal SUPERADMIN /
 * ADMIN). ACCOUNT_MANAGER (USER) and CLIENT are NOT agency-wide — they are
 * scoped by their explicit assignments. Drives IntegrationService.getScope.
 */
export function isAgencyWideRole(role: string | null | undefined): boolean {
  return role === 'SUPERADMIN' || role === 'ADMIN';
}

/** True only for the platform owner tier (SUPER_ADMIN). Protected actions
 *  (DBU integration settings, secrets, ownership transfer, removing a super
 *  admin) must be gated on this — an AGENCY_ADMIN must not pass. */
export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === 'SUPERADMIN';
}
