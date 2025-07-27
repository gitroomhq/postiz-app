import { SentryReactService } from '@gitroom/helpers/sentry/sentry.react';
import { enableFetchTracking } from './tracked-fetch';

// Initialize Sentry for client-side
if (typeof window !== 'undefined') {
  SentryReactService.init();
  
  // Enable automatic fetch tracking
  // enableFetchTracking(); // Temporarily disabled
}

// Create service wrapper for compatibility
export const SentryClientService = {
  captureException: (error: any, context?: any) => {
    if (typeof window === 'undefined') return;
    return SentryReactService.captureException(error, context);
  },
  
  captureMessage: (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: any) => {
    if (typeof window === 'undefined') return;
    return SentryReactService.captureMessage(message, level, context);
  },
  
  setUser: (user: { id?: string; email?: string; username?: string; organizationId?: string }) => {
    if (typeof window === 'undefined') return;
    SentryReactService.setUser(user);
  },
  
  addBreadcrumb: (message: string, category?: string, data?: any) => {
    if (typeof window === 'undefined') return;
    SentryReactService.addBreadcrumb(message, category, data);
  },
  
  setTag: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    SentryReactService.setTag(key, value);
  },
  
  setContext: (key: string, context: any) => {
    if (typeof window === 'undefined') return;
    SentryReactService.setContext(key, context);
  },
  
  showReportDialog: (eventId?: string) => {
    if (typeof window === 'undefined') return;
    SentryReactService.showReportDialog(eventId);
  },
};
