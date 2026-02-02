'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { FC, ReactNode, useEffect } from 'react';
export const PHProvider: FC<{
  children: ReactNode;
  phkey?: string;
  host?: string;
  nonce?: string;
}> = ({ children, phkey, host, nonce }) => {
  useEffect(() => {
    if (!phkey || !host) {
      return;
    }
    posthog.init(phkey, {
      api_host: host,
      person_profiles: 'identified_only',
      capture_pageview: false, // Disable automatic pageview capture, as we capture manually
      script_nonce: nonce,
    });
  }, []);
  if (!phkey || !host) {
    return <>{children}</>;
  }
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
};
