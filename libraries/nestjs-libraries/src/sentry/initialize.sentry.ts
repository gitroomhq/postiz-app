import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { capitalize } from 'lodash';

export const initializeSentry = (appName: string, allowLogs = false) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return null;
  }

  try {
    Sentry.init({
      initialScope: {
        tags: {
          service: appName,
          component: 'nestjs',
        },
        contexts: {
          app: {
            name: `Postiz ${capitalize(appName)}`,
          },
        },
      },
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      integrations: [
        // Add our Profiling integration
        nodeProfilingIntegration(),
        ...allowLogs ? [Sentry.consoleLoggingIntegration({ levels: ['log', 'error', 'warn'] })] : [],
      ],
      tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.3,
      enableLogs: allowLogs,
    });
  } catch (err) {}
  return true;
};
