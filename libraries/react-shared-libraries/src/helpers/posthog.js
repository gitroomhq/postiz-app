'use client';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';
export const PHProvider = ({ children, phkey, host }) => {
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
//# sourceMappingURL=posthog.js.map