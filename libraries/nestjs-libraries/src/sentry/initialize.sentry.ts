import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { capitalize } from 'lodash';

export const setSentryUserContext = (params: {
  userId?: string;
  email?: string;
  orgId?: string;
  paymentId?: string | null;
}) => {
  try {
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
      environment: process.env.NODE_ENV || 'development',
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      spotlight: process.env.SENTRY_SPOTLIGHT === '1',
      integrations: [
        // Add our Profiling integration
        nodeProfilingIntegration(),
        Sentry.consoleLoggingIntegration({ levels: ['log', 'info', 'warn', 'error', 'debug', 'assert', 'trace'] }),
        // AI calls are traced for timing and errors only; prompts and outputs are users' content and stay out.
        Sentry.openAIIntegration({
          recordInputs: false,
          recordOutputs: false,
        }),
      ],
      tracesSampler: ({ name, attributes, normalizedRequest, inheritOrSampleWith }) => {
        const path = String(
          normalizedRequest?.url || attributes?.['http.target'] || attributes?.['url.path'] || name || ''
        );
        const method = String(
          normalizedRequest?.method || attributes?.['http.request.method'] || attributes?.['http.method'] || ''
        );
        // MCP stream GETs are declined with 405; never trace them
        if (method === 'GET' && /^(https?:\/\/[^/]+)?\/mcp(\/|-oauth|\?|$)/.test(path)) {
          return 0;
        }
        if (name?.startsWith('prisma:')) {
          return 0;
        }
        return inheritOrSampleWith(
          path.includes('/public/v1/analytics/') ? 0.01 : 0.5
        );
      },
      ignoreSpans: [
        /^prisma:(client:serialize|engine:(query|serialize|response_json_serialization|connection))$/,
        { op: 'db', name: /^(BEGIN|COMMIT|DEALLOCATE ALL)$/ },
        { op: 'middleware.express' },
      ],
      enableLogs: true,

      // Profiling
      profileSessionSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.4,
      profileLifecycle: 'trace',
    });
  } catch (err) {
    console.log(err);
  }
  return true;
};
