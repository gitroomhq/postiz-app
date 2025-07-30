import * as Sentry from '@sentry/nextjs';
import { initializeSentryBasic } from '@gitroom/react/sentry/initialize.sentry.next.basic';

export const initializeSentryServer = (dsn: string) =>
  initializeSentryBasic(dsn, {});
