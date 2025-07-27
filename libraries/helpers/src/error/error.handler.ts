import { Logger } from '@nestjs/common';
import { SentryNestJSService } from '../sentry';

export interface ErrorContext {
  url?: string;
  method?: string;
  userId?: string;
  organizationId?: string;
  integration?: string;
  provider?: string;
  metadata?: Record<string, any>;
}

export class ErrorHandler {
  private static readonly logger = new Logger(ErrorHandler.name);

  static async handleAsync<T>(
    operation: () => Promise<T>,
    context: ErrorContext = {},
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      this.logError(error, context);
      if (fallback !== undefined) {
        return fallback;
      }
      throw error;
    }
  }

  static handle<T>(
    operation: () => T,
    context: ErrorContext = {},
    fallback?: T
  ): T | undefined {
    try {
      return operation();
    } catch (error) {
      this.logError(error, context);
      if (fallback !== undefined) {
        return fallback;
      }
      throw error;
    }
  }

  static logError(error: unknown, context: ErrorContext = {}) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Log with appropriate level
    if (this.isCriticalError(error)) {
      this.logger.error(`Critical error: ${errorMessage}`, stack);
    } else if (this.isWarning(error)) {
      this.logger.warn(`Warning: ${errorMessage}`);
    } else {
      this.logger.error(`Error: ${errorMessage}`, stack);
    }

    // Send to Sentry for server errors and critical issues
    if (this.shouldReportToSentry(error)) {
      SentryNestJSService.captureException(error, {
        extra: context,
        tags: {
          errorType: this.getErrorType(error),
          provider: context.provider,
          integration: context.integration,
        },
      });
    }
  }

  private static isCriticalError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const criticalPatterns = [
      /database/i,
      /redis/i,
      /connection/i,
      /timeout/i,
      /out of memory/i,
    ];
    
    return criticalPatterns.some(pattern => pattern.test(error.message));
  }

  private static isWarning(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const warningPatterns = [
      /rate limit/i,
      /quota/i,
      /429/i,
      /throttle/i,
    ];
    
    return warningPatterns.some(pattern => pattern.test(error.message));
  }

  private static shouldReportToSentry(error: unknown): boolean {
    if (!(error instanceof Error)) return true;
    
    // Don't report to Sentry for expected errors
    const ignoredPatterns = [
      /validation/i,
      /unauthorized/i,
      /forbidden/i,
      /not found/i,
      /400/i,
      /401/i,
      /403/i,
      /404/i,
    ];
    
    return !ignoredPatterns.some(pattern => pattern.test(error.message));
  }

  private static getErrorType(error: unknown): string {
    if (!(error instanceof Error)) return 'unknown';
    
    if (error.name.includes('Database')) return 'database';
    if (error.name.includes('Redis')) return 'redis';
    if (error.name.includes('HTTP')) return 'http';
    if (error.name.includes('Validation')) return 'validation';
    if (error.name.includes('Auth')) return 'authentication';
    
    return 'application';
  }
}
