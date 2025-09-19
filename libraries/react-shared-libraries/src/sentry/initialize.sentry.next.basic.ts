import * as Sentry from '@sentry/nextjs';

export const initializeSentryBasic = (environment: string, dsn: string, extension: any) => {
  if (!dsn) {
    return;
  }

  try {
    Sentry.init({
      initialScope: {
        tags: {
          service: 'frontend',
          component: 'nextjs',
          replaysEnabled: 'true',
        },
        contexts: {
          app: {
            name: 'Postiz Frontend',
            version: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0',
          },
        },
      },
      environment: environment || 'development',
      dsn,
      sendDefaultPii: true,
      ...extension,
      debug: environment === 'development',
      tracesSampleRate: environment === 'development' ? 1.0 : 0.3,

      // Filtert Events und zeigt das User-Feedback-Modal an
      beforeSend(event, hint) {
        if (event.exception && event.exception.values) {
          for (const exception of event.exception.values) {
            // Filtert "Failed to fetch" Fehler heraus
            if (exception.value && /Failed to fetch/.test(exception.value)) {
              return null; // Verwirft den Event
            }
          }
        }
        
        // Wenn der Event eine Ausnahme ist und nicht gefiltert wurde, 
        // wird das User-Feedback-Modal angezeigt
        if (event.exception && event.event_id) {
          Sentry.showReportDialog({ eventId: event.event_id });
        }
        
        return event; // Sendet den Event an Sentry
      },
    });
  } catch (err) {}
};
