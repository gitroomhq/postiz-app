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
      Sentry.setTag('organization.id', user.orgId);
    } else {
      Sentry.setUser(null);
      Sentry.setTag('organization.id', undefined);
    }
  } catch (err) {
    /* never let telemetry break the app */
  }
};

export const initializeSentryClient = (environment: string, dsn: string) => {
  // A remounted layout must not build a second replay integration, Sentry throws on it
  if (Sentry.getClient()) {
    return;
  }

  return initializeSentryBasic(environment, dsn, {
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
};
