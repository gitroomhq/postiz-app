import * as Sentry from '@sentry/nextjs';
import { initializeSentryClient } from '@gitroom/react/sentry/initialize.sentry.client';

initializeSentryClient(
  process.env.NODE_ENV!,
  process.env.NEXT_PUBLIC_SENTRY_DSN!
);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
