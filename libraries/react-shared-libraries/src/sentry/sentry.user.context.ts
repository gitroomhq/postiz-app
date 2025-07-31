'use client';

import * as Sentry from '@sentry/nextjs';

interface UserInfo {
  id: string;
  email: string;
  orgId?: string;
  role?: string;
  tier?: string;
  admin?: boolean;
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
  
  if (user.admin) {
    Sentry.setTag('user.admin', true);
  }
};

/**
 * Clears the Sentry user context.
 * Useful when logging out or switching users.
 * Only executes if Sentry DSN is configured.
 */
export const clearSentryUserContext = () => {
  // Only clear context if Sentry is configured (check at runtime for frontend)
  if (typeof window !== 'undefined' && !window.location.origin.includes('localhost')) {
    // For production, check if Sentry DSN exists in environment or is initialized
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return;
    }
  } else if (typeof process !== 'undefined' && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // For server-side or development
    return;
  }

  Sentry.setUser(null);
  Sentry.setTag('user.org_id', undefined);
  Sentry.setTag('user.role', undefined);
  Sentry.setTag('user.tier', undefined);
  Sentry.setTag('user.admin', undefined);
};
