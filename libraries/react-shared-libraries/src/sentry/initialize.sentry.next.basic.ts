import * as Sentry from '@sentry/nextjs';

export const initializeSentryBasic = (environment: string, dsn: string, extension: any) => {
  if (!dsn) {
    return;
  }

  try {
    Sentry.init({
      initialScope: {
        tags: {
          service: 'frontend',
          component: 'nextjs',
          replaysEnabled: 'true',
        },
        contexts: {
          app: {
            name: 'Postiz Frontend',
            version: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0',
          },
        },
      },
      environment: environment || 'development',
      dsn,
      sendDefaultPii: true,
      ...extension,
      debug: environment === 'development',
      tracesSampleRate: environment === 'development' ? 1.0 : 0.3,
    });
  } catch (err) {}
};
