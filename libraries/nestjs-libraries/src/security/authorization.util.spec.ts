import {
  AccessScope,
  canAccessIntegration,
  isGroupInScope,
  isPostInScope,
} from './authorization.util';

/**
 * Security regression suite for the centralized object-level authorization
 * decision. These map 1:1 onto the required Mapped Out authorization tests
 * (docs/MAPPED_OUT_UPGRADE_AUDIT.md §15) for the per-client (assignment) boundary.
 *
 * Fixtures:
 *   ORG          = the single workspace both clients live in.
 *   INT_A / INT_B = social-account (Integration) ids belonging to Client A / B.
 *   superScope    = super admin / org owner (unrestricted).
 *   managerA      = a member assigned ONLY to Client A's account.
 *   none          = a member with no assignments (deny-all).
 */
const ORG = 'org-1';
const OTHER_ORG = 'org-2';
const INT_A = 'integration-A';
const INT_B = 'integration-B';

const superScope: AccessScope = { all: true, integrationIds: [] };
const managerA: AccessScope = { all: false, integrationIds: [INT_A] };
const none: AccessScope = { all: false, integrationIds: [] };

const postA = { organizationId: ORG, integrationId: INT_A };
const postB = { organizationId: ORG, integrationId: INT_B };
const postOtherOrg = { organizationId: OTHER_ORG, integrationId: INT_A };

describe('canAccessIntegration', () => {
  it('super/org-owner scope can access any integration', () => {
    expect(canAccessIntegration(superScope, INT_A)).toBe(true);
    expect(canAccessIntegration(superScope, INT_B)).toBe(true);
  });
  it('assigned member can access their integration', () => {
    expect(canAccessIntegration(managerA, INT_A)).toBe(true);
  });
  it('assigned member cannot access an unassigned integration', () => {
    expect(canAccessIntegration(managerA, INT_B)).toBe(false);
  });
  it('member with no assignments can access nothing', () => {
    expect(canAccessIntegration(none, INT_A)).toBe(false);
    expect(canAccessIntegration(none, INT_B)).toBe(false);
  });
});

describe('isPostInScope — per-client (assignment) boundary', () => {
  it('User assigned to Client A CAN read a Client A post', () => {
    expect(isPostInScope(postA, ORG, managerA)).toBe(true);
  });
  it('User assigned to Client A CANNOT read a Client B post by id (IDOR blocked)', () => {
    expect(isPostInScope(postB, ORG, managerA)).toBe(false);
  });
  it('URL/param manipulation to another client is blocked (same as above, by id)', () => {
    // Attacker (managerA) supplies Client B's post id directly.
    expect(isPostInScope(postB, ORG, managerA)).toBe(false);
  });
  it('SUPER_ADMIN / org owner remains globally authorized within the org', () => {
    expect(isPostInScope(postA, ORG, superScope)).toBe(true);
    expect(isPostInScope(postB, ORG, superScope)).toBe(true);
  });
  it('member with no assignments is denied every post', () => {
    expect(isPostInScope(postA, ORG, none)).toBe(false);
    expect(isPostInScope(postB, ORG, none)).toBe(false);
  });
  it('org boundary still holds: cannot reach a post in another org even as super scope', () => {
    expect(isPostInScope(postOtherOrg, ORG, superScope)).toBe(false);
    expect(isPostInScope(postOtherOrg, ORG, managerA)).toBe(false);
  });
  it('a not-found post (null) is never in scope', () => {
    expect(isPostInScope(null, ORG, superScope)).toBe(false);
    expect(isPostInScope(undefined, ORG, managerA)).toBe(false);
  });
});

describe('isGroupInScope — group / export routes', () => {
  it('a group entirely within scope is accessible', () => {
    expect(isGroupInScope([postA, postA], ORG, managerA)).toBe(true);
  });
  it('a group containing ANY out-of-scope post is denied (no partial-leak export)', () => {
    expect(isGroupInScope([postA, postB], ORG, managerA)).toBe(false);
  });
  it('an empty/unknown group is denied (never a silent allow)', () => {
    expect(isGroupInScope([], ORG, superScope)).toBe(false);
    expect(isGroupInScope(null, ORG, superScope)).toBe(false);
  });
  it('super scope can access a whole in-org group', () => {
    expect(isGroupInScope([postA, postB], ORG, superScope)).toBe(true);
  });
});
