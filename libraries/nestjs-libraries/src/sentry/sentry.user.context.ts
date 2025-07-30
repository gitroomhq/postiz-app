import * as Sentry from '@sentry/nestjs';
import { User } from '@prisma/client';

/**
 * Sets user context in Sentry with proper isolation to prevent context leaking between requests
 * Only sets context if user information is available and Sentry is configured
 */
export function setSentryUserContext(user: User | null | undefined, orgId?: string) {
  if (!user || !process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  Sentry.withIsolationScope((scope) => {
    scope.setTag('user.id', user.id);
    if (!orgId) return;
    scope.setTag('org.id', orgId);
  });
}
