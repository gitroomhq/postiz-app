import * as Sentry from '@sentry/nestjs';

/**
 * Wraps background job execution with Sentry isolation scope to prevent context leaking
 * Use this for cron jobs, queue workers, and other background tasks that have user context
 */
export async function withSentryBackgroundContext<T>(
  callback: () => Promise<T>,
  userId?: string,
  orgId?: string
): Promise<T> {
  return await Sentry.withIsolationScope(async () => {
    // Set user context if available and Sentry is configured
    if (!userId || !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return await callback();
    }
    
    Sentry.getCurrentScope().setTag('user.id', userId);
    if (!orgId) {
      return await callback();
    }
    Sentry.getCurrentScope().setTag('org.id', orgId);
    
    return await callback();
  });
}
