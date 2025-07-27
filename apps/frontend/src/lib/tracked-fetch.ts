'use client';

import { trackAPICall } from './sentry-tracking';

// Wrapper around fetch to automatically track API calls in Sentry
export async function trackedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const startTime = Date.now();
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method || 'GET';

  try {
    const response = await fetch(input, init);
    const duration = Date.now() - startTime;

    // Track the API call
    trackAPICall(method, url, response.status, duration);

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Track the failed API call
    trackAPICall(method, url, 0, duration, error);
    
    throw error;
  }
}

// Helper function to replace the global fetch with our tracked version
export function enableFetchTracking() {
  if (typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      // Only track API calls to our backend and not third-party services
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      
      // Track only calls to our backend API
      if (url.includes('/api/') || url.includes(process.env.NEXT_PUBLIC_BACKEND_URL || '')) {
        return trackedFetch(input, init);
      }
      
      // Use original fetch for other requests
      return originalFetch(input, init);
    };
  }
}
