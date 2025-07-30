import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export const initializeSentry = () => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return null;
  }

  console.log('loading sentry');
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    integrations: [
      // Add our Profiling integration
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  return true;
};
