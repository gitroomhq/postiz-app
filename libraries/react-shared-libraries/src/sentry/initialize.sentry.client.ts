import * as Sentry from '@sentry/nextjs';
import { initializeSentryBasic } from '@gitroom/react/sentry/initialize.sentry.next.basic';

export const initializeSentryClient = (environment: string, dsn: string) =>
  initializeSentryBasic(environment, dsn, {
    integrations: [
      // Add default integrations back
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
      }),
      Sentry.feedbackIntegration({
        // Disable the injection of the default widget
        autoInject: false,
      }),
    ],
    beforeSend(event: Sentry.Event, hint: Sentry.EventHint) {
      // Check if it is an exception, and if so, show the report dialog
      if (event.exception && event.event_id) {
        if (!shownReportDialogEventIds.has(event.event_id)) {
          try {
            Sentry.showReportDialog({ eventId: event.event_id });
            shownReportDialogEventIds.add(event.event_id);
          } catch (err) {
            // Prevent error reporting from causing its own errors
            // Optionally log the error for debugging
            // console.error('Failed to show Sentry report dialog:', err);
          }
        }
      }
      return event;
    },
    replaysSessionSampleRate: environment === 'development' ? 1.0 : 0.1,
    replaysOnErrorSampleRate: environment === 'development' ? 1.0 : 0.1,
  });
