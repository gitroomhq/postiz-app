'use client';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';

const ReturnUrlComponent = () => {
  const params = useSearchParams();
  const url = params.get('returnUrl');
  useEffect(() => {
    if (url?.indexOf?.('http')! > -1) {
      localStorage.setItem('returnUrl', url!);
    }
  }, [url]);

  return null;
}

export const useReturnUrl = () => {
  return {
    getAndClear: useCallback(() => {
      const data = localStorage.getItem('returnUrl');
      localStorage.removeItem('returnUrl');
      return data;
    }, [])
  }
}

export default ReturnUrlComponent;