import * as Sentry from '@sentry/nextjs';

export const initializeSentryBasic = (environment: string, dsn: string, extension: any) => {
  if (!dsn) {
    return;
  }

  const ignorePatterns = [
    /^Failed to fetch$/,
    /^Failed to fetch .*/i,
    /^Load failed$/i,
    /^Load failed .*/i,
    /^NetworkError when attempting to fetch resource\.$/i,
    /^NetworkError when attempting to fetch resource\. .*/i,
  ];

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
      integrations: [
        Sentry.consoleLoggingIntegration({ levels: ['log', 'info', 'warn', 'error', 'debug', 'assert', 'trace'] }),
      ],
      environment: environment || 'development',
      dsn,
      sendDefaultPii: true,
      ...extension,
      debug: environment === 'development',
      tracesSampleRate: 1.0,

      beforeSend(event, hint) {
        if (event.exception && event.exception.values) {
          for (const exception of event.exception.values) {
            if (exception.value) {
              for (const pattern of ignorePatterns) {
                if (pattern.test(exception.value)) {
                  return null; // Ignore the event
                }
              }
            }
          }

          // If there's an exception and an event id, present the user report dialog.
          if (event.event_id) {
            // Only attempt to show the dialog in a browser environment.
            if (typeof window !== 'undefined' && window.document) {
              // Dynamically import the package that exports showReportDialog to avoid
              // bundler errors when this shared lib is used in non-browser builds.
              import('@sentry/react')
                .then((mod) => {
                  try {
                    mod.showReportDialog({ eventId: event.event_id });
                  } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Sentry.showReportDialog failed:', err);
                  }
                })
                .catch((importErr) => {
                  // eslint-disable-next-line no-console
                  console.error('Failed to import @sentry/react for report dialog:', importErr);
                });
            }
          }
        }

        return event; // Send the event to Sentry
      },
    });
  } catch (err) {
    // Log initialization errors
    // eslint-disable-next-line no-console
    console.error('Sentry.init failed:', err);
  }
};
