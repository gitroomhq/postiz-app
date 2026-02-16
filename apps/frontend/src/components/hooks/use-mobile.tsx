'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect if the current viewport is mobile-sized (≤768px)
 * @returns {boolean} true if viewport width is ≤768px
 */
export const useMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Check on mount
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};
