// Sentry initialization for the Edge runtime (middleware, edge routes).
// Loaded by instrumentation.ts when NEXT_RUNTIME === "edge".
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% of traces in development, 10% in production.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  enableLogs: true,

  sendDefaultPii: true,
});
