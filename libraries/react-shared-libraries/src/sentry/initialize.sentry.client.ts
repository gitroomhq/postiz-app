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
    ],
    replaysSessionSampleRate:
      environment === 'development' ? 1.0 : 0.1,
    replaysOnErrorSampleRate:
      environment === 'development' ? 1.0 : 0.1,
  });
