'use client';

import { FC, ReactNode, useEffect } from 'react';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { initializeSentryClient } from '@gitroom/react/sentry/initialize.sentry.client';

export const SentryComponent: FC<{ children: ReactNode }> = ({ children }) => {
  const { sentryDsn: dsn } = useVariables();

  useEffect(() => {
    if (!dsn) {
      return;
    }

    initializeSentryClient(dsn);
  }, [dsn]);

  // Always render children - don't block the app
  return <>{children}</>;
};
