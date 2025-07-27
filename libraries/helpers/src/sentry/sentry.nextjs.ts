// Next.js-specific Sentry configuration
import * as Sentry from '@sentry/nextjs';

interface SentryConfig {
  enabled: boolean;
  dsn: string;
  environment: string;
  debug: boolean;
  release: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
}

function getConfig(): SentryConfig {
  return {
    enabled: process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true',
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true',
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    replaysSessionSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || '0.1'),
    replaysOnErrorSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || '1.0'),
  };
}

export class SentryNextService {
  private static initialized = false;

  static init() {
    // Only run on client side and only once
    if (typeof window === 'undefined' || this.initialized) return;
    
    const config = getConfig();
    
    if (!config.enabled || !config.dsn) {
      console.log('[Frontend] Sentry is disabled');
      return;
    }

    console.log(`[Frontend] Initializing Sentry with environment: ${config.environment}`);

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      debug: config.debug,
      release: config.release,
      
      // Performance Monitoring
      tracesSampleRate: config.tracesSampleRate,
      
      // Session Replay
      replaysSessionSampleRate: config.replaysSessionSampleRate,
      replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,
      
      integrations: [
        // Browser tracing for performance monitoring
        Sentry.browserTracingIntegration(),
        
        // Session replay integration
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
        
        // Breadcrumbs for user interactions
        Sentry.breadcrumbsIntegration({
          console: false,
          dom: true,
          fetch: true,
          history: true,
          sentry: true,
          xhr: true,
        }),
      ],
      
      beforeSend(event, hint) {
        // Filter out known non-critical errors
        if (event.exception) {
          const error = hint.originalException;
          
          // Skip network errors that are likely user-related
          if (error && error instanceof TypeError) {
            const message = error.message || '';
            if (message.includes('NetworkError') || 
                message.includes('Failed to fetch') ||
                message.includes('Load failed')) {
              return null;
            }
          }
          
          // Skip ResizeObserver errors (common browser quirk)
          if (error && typeof error === 'object' && 'message' in error && 
              typeof error.message === 'string' && error.message.includes('ResizeObserver')) {
            return null;
          }
          
          // Skip AbortError (user navigation)
          if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
            return null;
          }
        }
        
        return event;
      },
      
      // Set user context
      initialScope: {
        tags: {
          service: 'frontend',
          version: config.release,
        },
      },
    });

    this.initialized = true;

    // Set up global error handlers
    window.addEventListener('error', (event) => {
      console.error('[Frontend] Global Error:', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('[Frontend] Unhandled Promise Rejection:', event.reason);
    });
  }

  static captureException(error: any, context?: any) {
    if (typeof window === 'undefined') return;
    
    return Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional_context', context);
      }
      return Sentry.captureException(error);
    });
  }

  static captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: any) {
    if (typeof window === 'undefined') return;
    
    return Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional_context', context);
      }
      return Sentry.captureMessage(message, level);
    });
  }

  static setUser(user: { id?: string; email?: string; username?: string; organizationId?: string }) {
    if (typeof window === 'undefined') return;
    
    Sentry.setUser(user);
  }

  static addBreadcrumb(message: string, category?: string, data?: any) {
    if (typeof window === 'undefined') return;
    
    Sentry.addBreadcrumb({
      message,
      category: category || 'custom',
      data,
      timestamp: Date.now() / 1000,
    });
  }

  static setTag(key: string, value: string) {
    if (typeof window === 'undefined') return;
    
    Sentry.setTag(key, value);
  }

  static setContext(key: string, context: any) {
    if (typeof window === 'undefined') return;
    
    Sentry.setContext(key, context);
  }

  static showReportDialog(eventId?: string) {
    if (typeof window === 'undefined') return;
    
    Sentry.showReportDialog({
      eventId,
      title: 'Report a Bug',
      subtitle: 'Help us improve Postiz by reporting this error.',
      subtitle2: 'We\'ll get back to you if we need more information.',
    });
  }
}
