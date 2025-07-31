import * as Sentry from '@sentry/nestjs';
import { User } from '@prisma/client';

/**
 * Sets user context for Sentry for the current request.
 * This will include user information in all error reports and events.
 * Only executes if Sentry DSN is configured.
 * 
 * @param user - The user object from the database
 */
export const setSentryUserContext = (user: User | null) => {
  // Only set context if Sentry is configured
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  if (!user) {
    // Clear user context when no user is present
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.email, // Use email as username since that's the primary identifier
    // Add additional useful context
    ip_address: undefined, // Let Sentry auto-detect IP
  });

  // Also set additional tags for better filtering in Sentry
  Sentry.setTag('user.activated', user.activated);
  Sentry.setTag('user.provider', user.providerName || 'local');
  
  if (user.isSuperAdmin) {
    Sentry.setTag('user.super_admin', true);
  }
};

/**
 * Clears the Sentry user context.
 * Useful when logging out or switching users.
 * Only executes if Sentry DSN is configured.
 */
export const clearSentryUserContext = () => {
  // Only clear context if Sentry is configured
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  Sentry.setUser(null);
  Sentry.setTag('user.activated', undefined);
  Sentry.setTag('user.provider', undefined);
  Sentry.setTag('user.super_admin', undefined);
};
