'use client';

import * as Sentry from '@sentry/nextjs';

interface UserInfo {
  id: string;
  email: string;
  orgId?: string;
  role?: string;
  tier?: string;
}

/**
 * Sets user context for Sentry in the frontend.
 * This will include user information in all error reports and events.
 * Only executes if Sentry DSN is configured.
 * 
 * @param user - The user object from the API
 */
export const setSentryUserContext = (user: UserInfo | null) => {
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
  });

  // Also set additional tags for better filtering in Sentry
  if (user.orgId) {
    Sentry.setTag('user.org_id', user.orgId);
  }
  
  if (user.role) {
    Sentry.setTag('user.role', user.role);
  }
  
  if (user.tier) {
    Sentry.setTag('user.tier', user.tier);
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
  Sentry.setTag('user.org_id', '');
  Sentry.setTag('user.role', '');
  Sentry.setTag('user.tier', '');
};
