// Sentry initialization for the Node.js server runtime.
// Loaded by instrumentation.ts when NEXT_RUNTIME === "nodejs".
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% of traces in development, 10% in production.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Attach local variable values to stack frames (server only).
  includeLocalVariables: true,

  enableLogs: true,

  sendDefaultPii: true,
});
