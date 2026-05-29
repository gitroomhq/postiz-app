// Sentry initialization for the browser/client runtime.
// Loaded automatically by Next.js for the client bundle.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  integrations: [Sentry.replayIntegration()],

  // 100% of traces in development, 10% in production.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Session Replay: 10% of all sessions, 100% of sessions with an error.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  // Include IP / request headers on events.
  sendDefaultPii: true,
});

// Instruments App Router client-side navigation transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
