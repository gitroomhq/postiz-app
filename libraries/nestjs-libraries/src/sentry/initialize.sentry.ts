import { capitalize } from 'lodash';

type SentryModule = typeof import('@sentry/nestjs');

let cachedSentry: SentryModule | null = null;

// Loading @sentry/nestjs and @sentry/profiling-node together deadlocks the module
// loader on roughly 2% of process starts: the instrumentation hook @sentry/nestjs
// installs on require races the dlopen @sentry/profiling-node performs for its
// native addon. The process keeps a live Node runtime but never reaches Nest, so
// there is no crash, no log line, and — in the orchestrator — no Temporal worker.
//
// Because these were top-level imports, that risk was paid on every start, even
// with Sentry entirely unconfigured. Loading them behind the DSN check removes it
// for every deployment that does not use Sentry.
const loadSentry = (): SentryModule | null => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return null;
  }
  if (!cachedSentry) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedSentry = require('@sentry/nestjs');
  }
  return cachedSentry;
};

export const setSentryUserContext = (params: {
  userId?: string;
  email?: string;
  orgId?: string;
  paymentId?: string | null;
}) => {
  try {
    const Sentry = loadSentry();
    if (!Sentry) {
      return;
    }
    Sentry.setUser(
      params.userId
        ? { id: params.userId, ...(params.email ? { email: params.email } : {}) }
        : null
    );
    if (params.orgId) {
      Sentry.setTag('organization.id', params.orgId);
    }
    if (params.paymentId?.startsWith('cus_')) {
      Sentry.setTag('stripe.customer_id', params.paymentId);
    }
  } catch (err) {
    /* never let telemetry break a request */
  }
};

export const initializeSentry = (appName: string, allowLogs = false) => {
  const Sentry = loadSentry();
  if (!Sentry) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');

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
      integrations: [
        // Add our Profiling integration
        nodeProfilingIntegration(),
        Sentry.consoleLoggingIntegration({ levels: ['log', 'info', 'warn', 'error', 'debug', 'assert', 'trace'] }),
        Sentry.openAIIntegration({
          recordInputs: true,
          recordOutputs: true,
        }),
      ],
      tracesSampleRate: 1.0,
      enableLogs: true,

      // Profiling
      profileSessionSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.3,
      profileLifecycle: 'trace',
    });
  } catch (err) {
    console.log(err);
  }
  return true;
};
