import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { SentryConfigService } from './sentry.config';

export class SentryNestJSService {
  static init(serviceName: string, additionalIntegrations: any[] = []) {
    const config = SentryConfigService.getConfig();
    
    if (!config.enabled) {
      console.log(`[${serviceName}] Sentry is disabled`);
      return;
    }

    console.log(`[${serviceName}] Initializing Sentry with environment: ${config.environment}`);

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      debug: config.debug,
      release: config.release,
      serverName: `${serviceName}-${config.serverName}`,
      
      // Performance Monitoring
      tracesSampleRate: config.tracesSampleRate,
      profilesSampleRate: config.profilesSampleRate,
      
      integrations: [
        // Node.js profiling
        nodeProfilingIntegration(),
        
        // Http integration for tracing HTTP requests
        Sentry.httpIntegration({
          ignoreIncomingRequests: (url) => {
            // Ignore health checks and monitoring endpoints
            return url.includes('/health') || 
                   url.includes('/monitor') || 
                   url.includes('/favicon.ico') ||
                   url.includes('/_next/');
          },
        }),
        
        // Express integration for Express.js apps
        Sentry.expressIntegration(),
        
        // Additional integrations passed in
        ...additionalIntegrations,
      ],
      
      beforeSend(event, hint) {
        // Filter out known non-critical errors
        if (event.exception) {
          const error = hint.originalException;
          
          // Skip common connection errors
          if (error && typeof error === 'object' && 'code' in error) {
            const code = (error as any).code;
            if (['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(code)) {
              return null;
            }
          }
          
          // Skip Redis connection errors in development
          if (config.environment === 'development' && 
              event.exception?.values?.[0]?.value?.includes('Redis')) {
            return null;
          }
        }
        
        return event;
      },
      
      // Set user context
      initialScope: {
        tags: {
          service: serviceName,
          version: config.release,
        },
      },
    });

    // Set up global error handlers
    process.on('uncaughtException', (error) => {
      console.error(`[${serviceName}] Uncaught Exception:`, error);
      Sentry.captureException(error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error(`[${serviceName}] Unhandled Rejection at:`, promise, 'reason:', reason);
      Sentry.captureException(reason);
    });
  }

  static captureException(error: any, context?: any) {
    if (!SentryConfigService.isEnabled()) return;
    
    return Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional_context', context);
      }
      return Sentry.captureException(error);
    });
  }

  static captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: any) {
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

  static addBreadcrumb(message: string, category?: string, data?: any) {
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

  static setContext(key: string, context: any) {
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

  static close(timeout?: number) {
    if (!SentryConfigService.isEnabled()) return Promise.resolve(true);
    
    return Sentry.close(timeout);
  }
}
