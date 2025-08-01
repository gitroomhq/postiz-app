import * as Sentry from '@sentry/nextjs';
import { initializeSentryBasic } from '@gitroom/react/sentry/initialize.sentry.next.basic';

export const initializeSentryClient = (environment: string, dsn: string) =>
  initializeSentryBasic(environment, dsn, {
    integrations: [
      // Add default integrations back
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: true,

        // Manual Masking
        mask: ['.sentry-mask', '[data-sentry-mask]', 'data-sentry-mask'],
        unmask: ['.sentry-unmask', '[data-sentry-unmask]', 'data-sentry-unmask'],
      }),
      Sentry.feedbackIntegration({
        // Disable the injection of the default widget
        autoInject: false,
      }),
    ],
    replaysSessionSampleRate: environment === 'development' ? 1.0 : 0.1,
    replaysOnErrorSampleRate: environment === 'development' ? 1.0 : 0.1,
  });
