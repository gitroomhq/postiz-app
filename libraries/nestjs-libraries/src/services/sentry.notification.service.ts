import { Injectable } from '@nestjs/common';
import { SentryNestJSService } from '@gitroom/helpers/sentry';

@Injectable()
export class SentryNotificationService {
  
  /**
   * Track post publishing attempts and failures
   */
  trackPostEvent(event: 'attempt' | 'success' | 'failed', data: {
    postId: string;
    organizationId: string;
    userId?: string;
    provider: string;
    error?: any;
    metadata?: any;
  }) {
    const baseContext = {
      postId: data.postId,
      organizationId: data.organizationId,
      provider: data.provider,
      userId: data.userId,
    };

    switch (event) {
      case 'attempt':
        // Only track as breadcrumb, not as event
        SentryNestJSService.addBreadcrumb(
          `Post publishing attempt for ${data.provider}`,
          'post.attempt',
          baseContext
        );
        break;

      case 'success':
        // Only track as breadcrumb, not as event - we don't need to alert on success
        SentryNestJSService.addBreadcrumb(
          `Post published successfully to ${data.provider}`,
          'post.success',
          baseContext
        );
        break;

      case 'failed':
        // This is an actual error - capture it
        SentryNestJSService.captureException(data.error || new Error('Post publishing failed'), {
          extra: {
            ...baseContext,
            metadata: data.metadata,
          },
          tags: {
            event: 'post_failed',
            provider: data.provider,
          },
          level: 'error',
        });
        break;
    }
  }

  /**
   * Track integration connection issues
   */
  trackIntegrationEvent(event: 'connected' | 'disconnected' | 'failed' | 'refresh_needed', data: {
    integrationId: string;
    organizationId: string;
    userId?: string;
    provider: string;
    error?: any;
  }) {
    const baseContext = {
      integrationId: data.integrationId,
      organizationId: data.organizationId,
      provider: data.provider,
      userId: data.userId,
    };

    switch (event) {
      case 'connected':
        // Only track as breadcrumb - successful connections are not errors
        SentryNestJSService.addBreadcrumb(
          `Integration connected: ${data.provider}`,
          'integration.connected',
          baseContext
        );
        break;

      case 'disconnected':
        // Only track as breadcrumb unless it's unexpected
        SentryNestJSService.addBreadcrumb(
          `Integration disconnected: ${data.provider}`,
          'integration.disconnected',
          baseContext
        );
        break;

      case 'failed':
        // This is an actual error - capture it
        SentryNestJSService.captureException(data.error || new Error('Integration failed'), {
          extra: baseContext,
          tags: {
            event: 'integration_failed',
            provider: data.provider,
          },
          level: 'error',
        });
        break;

      case 'refresh_needed':
        // This is a warning-level issue that needs attention
        SentryNestJSService.captureMessage(`Integration needs refresh: ${data.provider}`, 'warning', {
          extra: baseContext,
          tags: {
            event: 'integration_refresh_needed',
            provider: data.provider,
          },
        });
        break;
    }
  }

  /**
   * Track user authentication events
   */
  trackAuthEvent(event: 'login' | 'logout' | 'failed_login' | 'registration', data: {
    userId?: string;
    email?: string;
    provider?: string;
    error?: any;
    ip?: string;
    userAgent?: string;
  }) {
    const baseContext = {
      userId: data.userId,
      email: data.email,
      provider: data.provider,
      ip: data.ip,
      userAgent: data.userAgent,
    };

    switch (event) {
      case 'login':
        // Set user context but don't create an event - successful logins are not errors
        SentryNestJSService.setUser({
          id: data.userId,
          email: data.email,
        });
        SentryNestJSService.addBreadcrumb(
          'User logged in',
          'auth.login',
          baseContext
        );
        break;

      case 'logout':
        // Just a breadcrumb - logouts are not errors
        SentryNestJSService.addBreadcrumb(
          'User logged out',
          'auth.logout',
          baseContext
        );
        break;

      case 'failed_login':
        // This is a security issue - capture it, but at warning level unless it's suspicious
        SentryNestJSService.captureMessage('Failed login attempt', 'warning', {
          extra: baseContext,
          tags: {
            event: 'failed_login',
            provider: data.provider || 'local',
          },
        });
        break;

      case 'registration':
        // Just a breadcrumb - registrations are not errors
        SentryNestJSService.addBreadcrumb(
          'User registered',
          'auth.registration',
          baseContext
        );
        break;
    }
  }

  /**
   * Track API rate limiting events
   */
  trackRateLimitEvent(data: {
    endpoint: string;
    userId?: string;
    organizationId?: string;
    ip?: string;
    limit: number;
    remaining: number;
  }) {
    SentryNestJSService.captureMessage('API rate limit exceeded', 'warning', {
      extra: data,
      tags: {
        event: 'rate_limit_exceeded',
        endpoint: data.endpoint,
      },
    });
  }

  /**
   * Track worker job failures
   */
  trackWorkerJobEvent(event: 'started' | 'completed' | 'failed' | 'stalled', data: {
    jobName: string;
    jobId: string;
    organizationId?: string;
    error?: any;
    duration?: number;
    attemptNumber?: number;
  }) {
    const baseContext = {
      jobName: data.jobName,
      jobId: data.jobId,
      organizationId: data.organizationId,
      duration: data.duration,
      attemptNumber: data.attemptNumber,
    };

    switch (event) {
      case 'started':
        // Just breadcrumb - job starting is not an error
        SentryNestJSService.addBreadcrumb(
          `Worker job started: ${data.jobName}`,
          'worker.started',
          baseContext
        );
        break;

      case 'completed':
        // Just breadcrumb - successful completion is not an error
        SentryNestJSService.addBreadcrumb(
          `Worker job completed: ${data.jobName}`,
          'worker.completed',
          baseContext
        );
        break;

      case 'failed':
        // This is an actual error - capture it
        SentryNestJSService.captureException(data.error || new Error('Worker job failed'), {
          extra: baseContext,
          tags: {
            event: 'worker_job_failed',
            jobName: data.jobName,
          },
          level: 'error',
        });
        break;

      case 'stalled':
        // This is a performance/reliability issue - capture as warning
        SentryNestJSService.captureMessage(`Worker job stalled: ${data.jobName}`, 'warning', {
          extra: baseContext,
          tags: {
            event: 'worker_job_stalled',
            jobName: data.jobName,
          },
        });
        break;
    }
  }

  /**
   * Track database connection issues
   */
  trackDatabaseEvent(event: 'connected' | 'disconnected' | 'error', data: {
    database: string;
    error?: any;
  }) {
    switch (event) {
      case 'connected':
        // Just breadcrumb - successful connections are not errors
        SentryNestJSService.addBreadcrumb(
          `Database connected: ${data.database}`,
          'database.connected',
          { database: data.database }
        );
        break;

      case 'disconnected':
        // Just breadcrumb - disconnections might be planned
        SentryNestJSService.addBreadcrumb(
          `Database disconnected: ${data.database}`,
          'database.disconnected',
          { database: data.database }
        );
        break;

      case 'error':
        // This is an actual error - capture it
        SentryNestJSService.captureException(data.error || new Error('Database error'), {
          extra: { database: data.database },
          tags: {
            event: 'database_error',
            database: data.database,
          },
          level: 'error',
        });
        break;
    }
  }

  /**
   * Track performance issues
   */
  trackPerformanceIssue(data: {
    operation: string;
    duration: number;
    threshold: number;
    metadata?: any;
  }) {
    if (data.duration > data.threshold) {
      SentryNestJSService.captureMessage(
        `Slow operation detected: ${data.operation}`,
        'warning',
        {
          extra: {
            operation: data.operation,
            duration: data.duration,
            threshold: data.threshold,
            metadata: data.metadata,
          },
          tags: {
            event: 'slow_operation',
            operation: data.operation,
          },
        }
      );
    }
  }
}
