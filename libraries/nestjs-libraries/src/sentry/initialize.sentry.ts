import * as Sentry from '@sentry/nestjs';
import { capitalize } from 'lodash';

// Try to import profiling integration, but skip if not available (Node version incompatibility)
let nodeProfilingIntegration: any = null;
try {
  const profilingModule = require('@sentry/profiling-node');
  nodeProfilingIntegration = profilingModule.nodeProfilingIntegration;
} catch (err) {
  console.log('[Sentry] Profiling integration not available for this Node version, skipping...');
}

export const initializeSentry = (appName: string, allowLogs = false) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return null;
  }

  try {
    const integrations = [
      Sentry.consoleLoggingIntegration({ levels: ['log', 'info', 'warn', 'error', 'debug', 'assert', 'trace'] }),
      Sentry.openAIIntegration({
        recordInputs: true,
        recordOutputs: true,
      }),
    ];

    // Add profiling integration only if available
    if (nodeProfilingIntegration) {
      integrations.unshift(nodeProfilingIntegration());
    }

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
      environment: process.env.NODE_ENV || 'development',
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      integrations,
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
