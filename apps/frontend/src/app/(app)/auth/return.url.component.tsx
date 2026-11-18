'use client';

import { useSearchParams } from 'next/navigation';
import { FC, useCallback, useEffect } from 'react';

// Only an address on this app, so signing in can never send someone to
// another site or run a javascript: URL
const sameOriginUrl = (url: string | null) => {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    return parsed.origin === window.location.origin &&
      parsed.protocol === window.location.protocol
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
};

const ReturnUrlComponent: FC = () => {
  const params = useSearchParams();
  const url = params.get('returnUrl');
  useEffect(() => {
    const returnUrl = sameOriginUrl(url);
    if (returnUrl) {
      localStorage.setItem('returnUrl', returnUrl);
    }
  }, [url]);
  return null;
};
export const useReturnUrl = () => {
  return {
    getAndClear: useCallback(() => {
      const data = localStorage.getItem('returnUrl');
      localStorage.removeItem('returnUrl');
      // also on read: localStorage can hold a value saved before this check
      return sameOriginUrl(data);
    }, []),
  };
};
export default ReturnUrlComponent;
