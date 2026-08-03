import * as Sentry from '@sentry/nestjs';
import { capitalize } from 'lodash';

export const initializeSentry = (appName: string, allowLogs = false) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return null;
  }

  // Required here rather than imported at the top: `@sentry/profiling-node`
  // pulls a prebuilt native binding, and it has none for every Node release —
  // on Node 25 the process dies on load. A top-level import made that fatal for
  // installs with no Sentry configured at all, which is most self-hosted ones.
  // Now nothing is loaded unless a DSN is set, and a missing binding degrades
  // to "no profiling" instead of "no server".
  let profiling: any = null;
  try {
    profiling = require('@sentry/profiling-node').nodeProfilingIntegration();
  } catch {
    profiling = null;
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
            name: `PostQueen ${capitalize(appName)}`,
          },
        },
      },
      environment: process.env.NODE_ENV || 'development',
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      spotlight: process.env.SENTRY_SPOTLIGHT === '1',
      integrations: [
        // Add our Profiling integration
        ...(profiling ? [profiling] : []),
        Sentry.consoleLoggingIntegration({ levels: ['log', 'info', 'warn', 'error', 'debug', 'assert', 'trace'] }),
        Sentry.openAIIntegration({
          recordInputs: true,
          recordOutputs: true,
        }),
      ],
      tracesSampleRate: 1.0,
      enableLogs: true,

      // Profiling
      profileSessionSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.45,
      profileLifecycle: 'trace',
    });
  } catch (err) {
    console.log(err);
  }
  return true;
};
