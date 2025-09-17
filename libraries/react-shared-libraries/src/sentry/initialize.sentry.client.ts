import * as Sentry from '@sentry/nextjs';
import { initializeSentryBasic } from '@gitroom/react/sentry/initialize.sentry.next.basic';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export const initializeSentryClient = (environment: string, dsn: string) =>
  initializeSentryBasic(environment, dsn, {
    integrations: [
      // Add default integrations back
      Sentry.browserTracingIntegration(),
      nodeProfilingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
      }),
      Sentry.feedbackIntegration({
        // Disable the injection of the default widget
        autoInject: false,
      }),
    ],
    replaysSessionSampleRate: environment === 'development' ? 1.0 : 0.5,
    replaysOnErrorSampleRate: 1.0,

        
     // Profiling
    profileSessionSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.15,
    profileLifecycle: 'trace',
  });
