import * as Sentry from '@sentry/nextjs';

/**
 * Sets user context in Sentry for the current scope
 * Only sets context if user information is available
 */
export function setSentryUserContext(user: { id: string } | null | undefined, orgId?: string) {
  if (!user) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag('user.id', user.id);
    if (orgId) {
      scope.setTag('org.id', orgId);
    }
  });
}
