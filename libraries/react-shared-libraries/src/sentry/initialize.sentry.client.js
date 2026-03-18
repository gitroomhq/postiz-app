import * as Sentry from '@sentry/nextjs';
import { initializeSentryBasic } from "./initialize.sentry.next.basic";
export const initializeSentryClient = (environment, dsn) => initializeSentryBasic(environment, dsn, {
    integrations: [
        // Add default integrations back
        Sentry.browserTracingIntegration(),
        Sentry.browserProfilingIntegration(),
        Sentry.replayIntegration({
            maskAllText: true,
            maskAllInputs: true,
        }),
        Sentry.feedbackIntegration({
            // Disable the injection of the default widget
            autoInject: false,
        }),
        Sentry.replayCanvasIntegration(),
    ],
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
    profilesSampleRate: environment === 'development' ? 1.0 : 0.75,
});
//# sourceMappingURL=initialize.sentry.client.js.map