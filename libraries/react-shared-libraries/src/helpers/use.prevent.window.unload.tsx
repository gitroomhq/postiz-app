import { useEffect } from 'react';
export const usePreventWindowUnload = (preventDefault: boolean) => {
  useEffect(() => {
    if (!preventDefault) return;
    const handleBeforeUnload = (event: any) => event.preventDefault();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [preventDefault]);
};
