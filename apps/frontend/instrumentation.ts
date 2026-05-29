// Server-side registration hook. Stable in Next.js 14.0.4+.
// Dispatches to the correct Sentry runtime config.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Captures unhandled server-side request errors. Requires @sentry/nextjs >= 8.28.0.
export const onRequestError = Sentry.captureRequestError;
