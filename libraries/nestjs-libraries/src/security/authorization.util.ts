/**
 * Mapped Out — centralized object-level authorization decision.
 *
 * ONE source of truth for "can this user, given their assignment scope, act on
 * this object". Controllers and services MUST route every by-id / by-group
 * decision through these pure functions instead of re-implementing org/scope
 * checks inline (which is how the per-client IDOR on the by-id post routes
 * arose — see docs/MAPPED_OUT_UPGRADE_AUDIT.md §16).
 *
 * Scope is produced by IntegrationService.getScope():
 *   - Global super admin / org owner (org role SUPERADMIN) => { all: true }.
 *   - Any other member => { all:false, integrationIds:[...assigned...] }.
 *   - No membership => { all:false, integrationIds:[] } (deny-all).
 *
 * These functions are intentionally pure (no I/O, no Nest, no Prisma) so the
 * security decision is trivially and exhaustively unit-testable.
 */

export interface AccessScope {
  /** true = unrestricted within the org (super admin / org owner). */
  all: boolean;
  /** Integration (social account) ids this member is assigned to. */
  integrationIds: string[];
  /** Customer (client) ids this member is assigned to (optional, for future object types). */
  customerIds?: string[];
}

/** Minimal shape needed to authorize access to a post. */
export interface PostScopeSubject {
  organizationId: string;
  integrationId: string;
}

/**
 * Can the given scope act on an integration (social account) in this org?
 * `all` scopes pass; otherwise the integration must be explicitly assigned.
 */
export function canAccessIntegration(
  scope: AccessScope,
  integrationId: string
): boolean {
  if (scope.all) {
    return true;
  }
  return scope.integrationIds.includes(integrationId);
}

/**
 * Is a post within the caller's org AND assignment scope?
 * Mirrors PostsService.getPostIfAllowed exactly, as a pure predicate:
 *   in-org  AND  (scope.all OR post.integration is assigned).
 * A null/undefined post (not found) is never in scope.
 */
export function isPostInScope(
  post: PostScopeSubject | null | undefined,
  orgId: string,
  scope: AccessScope
): boolean {
  if (!post) {
    return false;
  }
  if (post.organizationId !== orgId) {
    return false;
  }
  return canAccessIntegration(scope, post.integrationId);
}

/**
 * Are ALL posts in a group within scope? Used for group-level routes
 * (GET/DELETE /group/:group, debug-export). Empty group => not accessible
 * (nothing to authorize = deny, never a silent allow).
 */
export function isGroupInScope(
  posts: PostScopeSubject[] | null | undefined,
  orgId: string,
  scope: AccessScope
): boolean {
  if (!posts || posts.length === 0) {
    return false;
  }
  return posts.every((p) => isPostInScope(p, orgId, scope));
}
