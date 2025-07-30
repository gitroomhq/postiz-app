import * as Sentry from '@sentry/nextjs';

export const initializeSentryBasic = (dsn: string, extension: any) => {
  if (!dsn) {
    return;
  }

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
    dsn,
    sendDefaultPii: true,
    ...extension,
    debug: process.env.NODE_ENV === 'development',
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  });
};
