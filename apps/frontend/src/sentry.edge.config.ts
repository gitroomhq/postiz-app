import { initializeSentryServer } from '@gitroom/react/sentry/initialize.sentry.server';

initializeSentryServer(process.env.NEXT_PUBLIC_SENTRY_DSN);