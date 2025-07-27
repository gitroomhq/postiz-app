'use client';

import { useEffect } from 'react';
import { initializeSentryClient } from '../../lib/sentry-client';

export function SentryClientProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Sentry client after the config script has run
    initializeSentryClient();
  }, []);

  return <>{children}</>;
}
