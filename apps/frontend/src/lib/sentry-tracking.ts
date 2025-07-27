'use client';

import { useEffect } from 'react';
import { SentryClientService } from './sentry';

interface User {
  id?: string;
  email?: string;
  username?: string;
  organizationId?: string;
}

export function useSentryUserTracking(user?: User) {
  useEffect(() => {
    if (user?.id) {
      SentryClientService.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        organizationId: user.organizationId,
      });
    }
  }, [user]);
}

export function useSentryPageTracking(pageName: string, pageData?: any) {
  useEffect(() => {
    SentryClientService.addBreadcrumb(
      `Navigated to ${pageName}`,
      'navigation',
      pageData
    );
  }, [pageName, pageData]);
}

export function trackUserAction(action: string, data?: any) {
  SentryClientService.addBreadcrumb(
    `User action: ${action}`,
    'user.action',
    data
  );
}

export function trackUIError(error: Error, component: string, props?: any) {
  SentryClientService.captureException(error, {
    extra: {
      component,
      props,
    },
    tags: {
      errorType: 'ui_error',
      component,
    },
    level: 'error',
  });
}

export function trackPerformanceIssue(operation: string, duration: number, threshold = 1000) {
  if (duration > threshold) {
    SentryClientService.captureMessage(
      `Slow UI operation: ${operation}`,
      'warning',
      {
        extra: {
          operation,
          duration,
          threshold,
        },
        tags: {
          errorType: 'performance_issue',
          operation,
        },
      }
    );
  }
}

export function trackAPICall(method: string, url: string, status: number, duration: number, error?: Error | unknown) {
  const baseData = {
    method,
    url,
    status,
    duration,
  };

  // Only capture actual errors and warnings, not successful requests
  if (error || status >= 400) {
    SentryClientService.captureException(error || new Error(`API Error: ${status}`), {
      extra: baseData,
      tags: {
        errorType: 'api_error',
        method,
        status: status.toString(),
      },
      level: status >= 500 ? 'error' : 'warning',
    });
  } else {
    // Just add breadcrumb for successful requests - no event creation
    SentryClientService.addBreadcrumb(
      `API call: ${method} ${url}`,
      'api.call',
      baseData
    );
  }

  // Track slow API calls as warnings (these are performance issues)
  if (duration > 5000) {
    SentryClientService.captureMessage(
      `Slow API call: ${method} ${url}`,
      'warning',
      {
        extra: baseData,
        tags: {
          errorType: 'slow_api_call',
          method,
        },
      }
    );
  }
}

export function trackPostPublishing(
  action: 'attempt' | 'success' | 'failed',
  data: {
    postId?: string;
    provider?: string;
    error?: any;
    metadata?: any;
  }
) {
  const baseData = {
    postId: data.postId,
    provider: data.provider,
    metadata: data.metadata,
  };

  switch (action) {
    case 'attempt':
      // Just breadcrumb - attempting to post is not an error
      SentryClientService.addBreadcrumb(
        `Post publishing attempt: ${data.provider}`,
        'post.attempt',
        baseData
      );
      break;

    case 'success':
      // Just breadcrumb - successful posts are not errors
      SentryClientService.addBreadcrumb(
        `Post published successfully: ${data.provider}`,
        'post.success',
        baseData
      );
      break;

    case 'failed':
      // This is an actual error - capture it
      SentryClientService.captureException(data.error || new Error('Post publishing failed'), {
        extra: baseData,
        tags: {
          errorType: 'post_publishing_failed',
          provider: data.provider || 'unknown',
        },
        level: 'error',
      });
      break;
  }
}

export function trackFormError(formName: string, field: string, error: string, formData?: any) {
  SentryClientService.captureMessage(
    `Form validation error in ${formName}: ${field}`,
    'warning',
    {
      extra: {
        formName,
        field,
        error,
        formData,
      },
      tags: {
        errorType: 'form_validation_error',
        form: formName,
        field,
      },
    }
  );
}

export function trackIntegrationEvent(
  action: 'connect_attempt' | 'connected' | 'disconnected' | 'error',
  data: {
    provider: string;
    error?: any;
    metadata?: any;
  }
) {
  const baseData = {
    provider: data.provider,
    metadata: data.metadata,
  };

  switch (action) {
    case 'connect_attempt':
      // Just breadcrumb - attempting to connect is not an error
      SentryClientService.addBreadcrumb(
        `Integration connection attempt: ${data.provider}`,
        'integration.attempt',
        baseData
      );
      break;

    case 'connected':
      // Just breadcrumb - successful connections are not errors
      SentryClientService.addBreadcrumb(
        `Integration connected: ${data.provider}`,
        'integration.connected',
        baseData
      );
      break;

    case 'disconnected':
      // Just breadcrumb - disconnections might be intentional
      SentryClientService.addBreadcrumb(
        `Integration disconnected: ${data.provider}`,
        'integration.disconnected',
        baseData
      );
      break;

    case 'error':
      // This is an actual error - capture it
      SentryClientService.captureException(data.error || new Error('Integration error'), {
        extra: baseData,
        tags: {
          errorType: 'integration_error',
          provider: data.provider,
        },
        level: 'error',
      });
      break;
  }
}
