import { useCallback } from 'react';
export const useMediaDirectory = () => {
  const set = useCallback((path: string) => {
    return path;
  }, []);
  return {
    set,
  };
};
