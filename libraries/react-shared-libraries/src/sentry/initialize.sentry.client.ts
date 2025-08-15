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
        try {
          // Only show report dialog in production to avoid spam during development
          if (environment === 'production') {
            Sentry.showReportDialog({ eventId: event.event_id });
          }
        } catch (err) {
          // Silently fail if dialog can't be shown - don't let this break error reporting
          // Note: Can't use Sentry logging here as we're already in a beforeSend callback
        }
      }
      return event;
    },
    replaysSessionSampleRate: environment === 'development' ? 1.0 : 0.1,
    replaysOnErrorSampleRate: environment === 'development' ? 1.0 : 0.1,
  });
