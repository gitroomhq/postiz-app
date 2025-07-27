// Initialize Sentry as early as possible for Next.js
import * as Sentry from '@sentry/nextjs';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true',
      release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      
      // Performance Monitoring
      tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      
      beforeSend(event, hint) {
        // Only enable if explicitly enabled
        if (process.env.NEXT_PUBLIC_SENTRY_ENABLED !== 'true') {
          return null;
        }
        
        return event;
      },
      
      // Set user context
      initialScope: {
        tags: {
          service: 'frontend-server',
          version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        },
      },
    });
  }
}
