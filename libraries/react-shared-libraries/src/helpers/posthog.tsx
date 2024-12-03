'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { FC, ReactNode, useEffect } from 'react';

export const PHProvider: FC<{
  children: ReactNode;
  phkey?: string;
  host?: string;
  enabled?: boolean;
}> = ({ children, phkey, host, enabled = false }) => {
  useEffect(() => {
    if (!enabled || !phkey || !host) {
      return;
    }

    posthog.init(phkey, {
      api_host: host,
      person_profiles: 'identified_only',
      capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    });
  }, [enabled]);

  if (!enabled || !phkey || !host) {
    return <>{children}</>;
  }
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
};
