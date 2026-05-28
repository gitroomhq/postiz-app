/**
 * Open-redirect guard.
 *
 * `new URL(input, base)` silently ignores the base when `input` is absolute,
 * so passing an unvalidated user-supplied `redirectTo` to NextResponse.redirect
 * (or `router.push`) lets an attacker land the post-auth victim on any
 * external URL. This helper enforces same-origin: only absolute-path
 * redirects are allowed (must start with "/" and NOT "//", which is a
 * protocol-relative URL).
 */

/** True only for safe in-app paths like "/me" or "/dashboard?x=1". */
export function isSafeRedirect(target: string | null | undefined): boolean {
  if (!target) return false;
  // Must be an absolute path. Reject protocol-relative ("//evil.com"),
  // absolute URLs ("https://evil.com"), data URIs, javascript: URIs, etc.
  if (!target.startsWith('/')) return false;
  if (target.startsWith('//')) return false;
  // Backslash trick — some browsers normalize "/\\evil.com" to "//evil.com".
  if (target.startsWith('/\\')) return false;
  return true;
}

/** Sanitize a redirect target, returning the fallback if unsafe. */
export function safeRedirect(
  target: string | null | undefined,
  fallback: string,
): string {
  return isSafeRedirect(target) ? target! : fallback;
}
