import * as Sentry from '@sentry/nextjs';
import { initializeSentryBasic } from '@gitroom/react/sentry/initialize.sentry.next.basic';

// Import or define frontendUrl, backendUrl and internalBackendUrl
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
const internalBackendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3000';

export const initializeSentryClient = (environment: string, dsn: string) =>
  initializeSentryBasic(environment, dsn, {
    integrations: [
      // Add default integrations back
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,

        // Allow (Internal) API and Frontend requests to be captured
      networkDetailAllowUrls: [
        new RegExp(`^${frontendUrl}(?:/.*)?$`),
        new RegExp(`^${backendUrl}(?:/.*)?$`),
        new RegExp(`^${internalBackendUrl}(?:/.*)?$`)
      ],
      networkRequestHeaders: ['X-Custom-Header'],
      networkResponseHeaders: ['X-Custom-Header'],
      }),
      Sentry.feedbackIntegration({
        // Disable the injection of the default widget
        autoInject: false,
      }),
    ],
    replaysSessionSampleRate: environment === 'development' ? 1.0 : 0.1,
    replaysOnErrorSampleRate: environment === 'development' ? 1.0 : 0.1,
  });
