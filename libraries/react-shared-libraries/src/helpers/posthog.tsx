'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { FC, ReactNode, useEffect } from 'react';

export const PHProvider: FC<{
  children: ReactNode;
  key?: string;
  host?: string;
}> = ({ children, key, host }) => {
  useEffect(() => {
    if (!key || !host) {
      return;
    }

    posthog.init(key, {
      api_host: host,
      person_profiles: 'identified_only',
      capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    });
  }, []);

  if (!key || !host) {
    return <>{children}</>;
  }
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
};
