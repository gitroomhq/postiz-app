// Initialize Sentry as early as possible for Next.js
import * as Sentry from '@sentry/nextjs';
import { SentryConfigService } from '@gitroom/helpers/sentry/sentry.config';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization
    const config = SentryConfigService.getConfig();
    
    if (!config.enabled) {
      console.log('[Server] Sentry is disabled');
      return;
    }

    console.log(`[Server] Initializing Sentry with environment: ${config.environment}`);

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      debug: config.debug,
      release: config.release,
      
      // Performance Monitoring
      tracesSampleRate: config.tracesSampleRate,
      
      // Profiling (server-side only)
      profilesSampleRate: config.profilesSampleRate,
      
      beforeSend(event, hint) {
        // Filter out non-critical errors on server side too
        if (event.exception) {
          const error = hint.originalException;
          
          // Skip common server errors that aren't actionable
          if (error && error instanceof Error) {
            const message = error.message || '';
            if (message.includes('ECONNRESET') || 
                message.includes('ENOTFOUND') ||
                message.includes('ETIMEDOUT')) {
              return null;
            }
          }
        }
        
        return event;
      },
      
      // Set user context
      initialScope: {
        tags: {
          service: 'frontend-server',
          version: config.release,
        },
      },
    });
  }
}
