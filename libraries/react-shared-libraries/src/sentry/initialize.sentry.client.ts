import * as Sentry from '@sentry/nextjs';
import { initializeSentryBasic } from '@gitroom/react/sentry/initialize.sentry.next.basic';

export const initializeSentryClient = (dsn: string) =>
  initializeSentryBasic(dsn, {
    integrations: [
      // Add default integrations back
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
      }),
    ],
    replaysSessionSampleRate:
      process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    replaysOnErrorSampleRate:
      process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  });
