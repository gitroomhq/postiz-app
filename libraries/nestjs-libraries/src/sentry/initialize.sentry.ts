import * as Sentry from '@sentry/nestjs';
import { capitalize } from 'lodash';

// Lazy-load profiling integration - native module may not be available on all platforms
let profilingIntegration: (() => Sentry.Integration) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  profilingIntegration = require('@sentry/profiling-node').nodeProfilingIntegration;
} catch {
  // Native profiling module not available - will skip profiling
}

export const initializeSentry = (appName: string, allowLogs = false) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return null;
  }

  const integrations: Sentry.Integration[] = [
    Sentry.consoleLoggingIntegration({ levels: ['log', 'info', 'warn', 'error', 'debug', 'assert', 'trace'] }),
    Sentry.openAIIntegration({
      recordInputs: true,
      recordOutputs: true,
    }),
  ];

  // Add profiling if native module is available
  if (profilingIntegration) {
    integrations.unshift(profilingIntegration());
  } else {
    console.log(`[Sentry] Profiling disabled: native module not available for Node.js ${process.version}`);
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
      environment: process.env.NODE_ENV || 'development',
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      spotlight: process.env.SENTRY_SPOTLIGHT === '1',
      integrations,
      tracesSampleRate: 1.0,
      enableLogs: true,

      // Profiling (only applies if profiling integration loaded)
      profileSessionSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.45,
      profileLifecycle: 'trace',
    });
  } catch (err) {
    console.log(err);
  }
  return true;
};
