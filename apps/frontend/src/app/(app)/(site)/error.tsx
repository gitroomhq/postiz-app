'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToaster } from '@gitroom/react/toaster/toaster';

export default function SiteError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const toaster = useToaster();

  useEffect(() => {
    toaster.show(
      error?.message
        ? `Page error: ${error.message}`
        : 'This page encountered an error — returning to the previous page.',
      'warning'
    );
    // Go back if there is a page to return to; otherwise fall back to /launches.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.replace('/launches');
    }
  }, []);

  // The layout (sidebar, header) remains mounted — this replaces only the
  // page content area while the navigation back completes.
  return (
    <div className="flex items-center justify-center flex-1 text-textItemBlur text-[14px]">
      Returning…
    </div>
  );
}
