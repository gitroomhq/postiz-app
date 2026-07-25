import {
  ASSIGNABLE_PRODUCT_ROLES,
  isAgencyWideRole,
  isSuperAdminRole,
  productRoleLabel,
  toInternalRole,
  toProductRole,
} from './roles';

describe('role model (Option B: enum kept, product roles on top)', () => {
  it('maps every internal role to its product role', () => {
    expect(toProductRole('SUPERADMIN')).toBe('SUPER_ADMIN');
    expect(toProductRole('ADMIN')).toBe('AGENCY_ADMIN');
    expect(toProductRole('USER')).toBe('ACCOUNT_MANAGER');
    expect(toProductRole('CLIENT')).toBe('CLIENT');
    expect(toProductRole(null)).toBeNull();
    expect(toProductRole('NONSENSE')).toBeNull();
  });

  it('maps product roles back to the internal enum (and is idempotent)', () => {
    expect(toInternalRole('SUPER_ADMIN')).toBe('SUPERADMIN');
    expect(toInternalRole('AGENCY_ADMIN')).toBe('ADMIN');
    expect(toInternalRole('ACCOUNT_MANAGER')).toBe('USER');
    expect(toInternalRole('CLIENT')).toBe('CLIENT');
    // idempotent: passing an already-internal role returns it unchanged
    expect(toInternalRole('ADMIN')).toBe('ADMIN');
    expect(toInternalRole('SUPERADMIN')).toBe('SUPERADMIN');
    expect(toInternalRole('NONSENSE')).toBeNull();
  });

  it('exposes human labels', () => {
    expect(productRoleLabel('SUPERADMIN')).toBe('Super Admin');
    expect(productRoleLabel('ADMIN')).toBe('Agency Admin');
    expect(productRoleLabel('USER')).toBe('Account Manager');
    expect(productRoleLabel('CLIENT')).toBe('Client');
  });

  it('CLIENT is never assignable to staff inside Mapped Out', () => {
    expect(ASSIGNABLE_PRODUCT_ROLES).toEqual([
      'SUPER_ADMIN',
      'AGENCY_ADMIN',
      'ACCOUNT_MANAGER',
    ]);
    expect(ASSIGNABLE_PRODUCT_ROLES).not.toContain('CLIENT');
  });

  describe('data-access scope by role', () => {
    it('SUPER_ADMIN and AGENCY_ADMIN are agency-wide', () => {
      expect(isAgencyWideRole('SUPERADMIN')).toBe(true);
      expect(isAgencyWideRole('ADMIN')).toBe(true);
    });
    it('ACCOUNT_MANAGER and CLIENT are NOT agency-wide (assignment-scoped)', () => {
      expect(isAgencyWideRole('USER')).toBe(false);
      expect(isAgencyWideRole('CLIENT')).toBe(false);
      expect(isAgencyWideRole(null)).toBe(false);
    });
  });

  describe('protected super-admin-only capability gate', () => {
    it('only SUPER_ADMIN passes (AGENCY_ADMIN must not)', () => {
      expect(isSuperAdminRole('SUPERADMIN')).toBe(true);
      expect(isSuperAdminRole('ADMIN')).toBe(false);
      expect(isSuperAdminRole('USER')).toBe(false);
      expect(isSuperAdminRole('CLIENT')).toBe(false);
    });
  });
});
