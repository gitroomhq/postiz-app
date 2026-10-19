import * as Sentry from '@sentry/nextjs';
import { initializeSentryBasic } from '@gitroom/react/sentry/initialize.sentry.next.basic';

export const setSentryUser = (
  user?: { id: string; email?: string; orgId: string } | null
) => {
  try {
    if (user?.id) {
      Sentry.setUser({
        id: user.id,
        ...(user.email ? { email: user.email } : {}),
      });
      if (user.email) {
        // 'user' itself is a reserved tag key - Sentry discards it if set directly
        Sentry.setTag('user.email', user.email);
      }
      Sentry.setTag('user.id', user.id);
      Sentry.setTag('organization', user.orgId);
      Sentry.setTag('organization.id', user.orgId);
    } else {
      Sentry.setUser(null);
      Sentry.setTag('user.email', undefined);
      Sentry.setTag('user.id', undefined);
      Sentry.setTag('organization', undefined);
      Sentry.setTag('organization.id', undefined);
    }
  } catch (err) {
    /* never let telemetry break the app */
  }
};

export const initializeSentryClient = (environment: string, dsn: string) =>
  initializeSentryBasic(environment, dsn, {
    integrations: [
      // Add default integrations back
      Sentry.browserTracingIntegration(),
      Sentry.browserProfilingIntegration(),
      // Session replays mask every text and input and block media, so a recording shows the layout of a
      // page, never the posts, names or files on it.
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
      Sentry.feedbackIntegration({
        // Disable the injection of the default widget
        autoInject: false,
        showEmail: false,
      }),
    ],
    replaysSessionSampleRate: 0.5,
    replaysOnErrorSampleRate: 1.0,

    profilesSampleRate: 1.0,
  });
