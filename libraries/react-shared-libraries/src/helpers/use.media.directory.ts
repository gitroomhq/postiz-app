import { useCallback } from 'react';
export const useMediaDirectory = () => {
  const set = useCallback((path: string) => {
    // Keep previews same-origin in a local stack.  Media records retain their
    // public HTTPS URL for Meta, while browser previews avoid free-tunnel
    // interstitials that appear as broken thumbnails.
    if (typeof window !== 'undefined' && /^https?:\/\//i.test(path || '')) {
      try {
        const url = new URL(path);
        if (url.pathname.startsWith('/uploads/')) {
          return `${window.location.origin}${url.pathname}${url.search}`;
        }
      } catch {
        // Fall back to the stored URL below.
      }
    }
    return path;
  }, []);
  return {
    set,
  };
};
