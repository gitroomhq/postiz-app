'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { FC, ReactNode, useEffect } from 'react';
export const PHProvider: FC<{
  children: ReactNode;
  phkey?: string;
  host?: string;
}> = ({ children, phkey, host }) => {
  useEffect(() => {
    if (!phkey || !host) {
      return;
    }
    posthog.init(phkey, {
      api_host: host,
      person_profiles: 'identified_only',
      capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    });
  }, []);
  if (!phkey || !host) {
    return <>{children}</>;
  }
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
};
