import * as Sentry from '@sentry/react';
import { SentryConfigService } from './sentry.config';

export class SentryReactService {
  static init() {
    const config = SentryConfigService.getConfig();
    
    if (!config.enabled) {
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
          // Mask all text content, inputs, etc.
          maskAllText: false,
          blockAllMedia: false,
        }),
        
        // Breadcrumbs for user interactions
        Sentry.breadcrumbsIntegration({
          console: false, // Don't capture console logs as breadcrumbs
          dom: true,      // Capture DOM interactions
          fetch: true,    // Capture fetch requests
          history: true,  // Capture navigation
          sentry: true,   // Capture Sentry events
          xhr: true,      // Capture XHR requests
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

    // Set up global error handlers
    window.addEventListener('error', (event) => {
      console.error('[Frontend] Global Error:', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('[Frontend] Unhandled Promise Rejection:', event.reason);
    });
  }

  static captureException(error: Error | unknown, context?: Record<string, unknown>) {
    if (!SentryConfigService.isEnabled()) return;
    
    return Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional_context', context);
      }
      return Sentry.captureException(error);
    });
  }

  static captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, unknown>) {
    if (!SentryConfigService.isEnabled()) return;
    
    return Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional_context', context);
      }
      return Sentry.captureMessage(message, level);
    });
  }

  static setUser(user: { id?: string; email?: string; username?: string; organizationId?: string }) {
    if (!SentryConfigService.isEnabled()) return;
    
    Sentry.setUser(user);
  }

  static addBreadcrumb(message: string, category?: string, data?: Record<string, unknown>) {
    if (!SentryConfigService.isEnabled()) return;
    
    Sentry.addBreadcrumb({
      message,
      category: category || 'custom',
      data,
      timestamp: Date.now() / 1000,
    });
  }

  static setTag(key: string, value: string) {
    if (!SentryConfigService.isEnabled()) return;
    
    Sentry.setTag(key, value);
  }

  static setContext(key: string, context: Record<string, unknown>) {
    if (!SentryConfigService.isEnabled()) return;
    
    Sentry.setContext(key, context);
  }

  static startTransaction(name: string, op?: string) {
    if (!SentryConfigService.isEnabled()) return null;
    
    // Use startSpan instead of deprecated startTransaction
    return Sentry.startSpan({
      name,
      op: op || 'custom',
    }, (span) => span);
  }

  static showReportDialog(eventId?: string) {
    if (!SentryConfigService.isEnabled()) return;
    
    Sentry.showReportDialog({
      eventId,
      title: 'Report a Bug',
      subtitle: 'Help us improve Postiz by reporting this error.',
      subtitle2: 'We\'ll get back to you if we need more information.',
    });
  }
}
