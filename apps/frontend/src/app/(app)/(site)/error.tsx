'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToaster } from '@gitroom/react/toaster/toaster';

export default function SiteError({
  error,
  reset,
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
        : 'This page encountered an error.',
      'warning'
    );
  }, []);

  return (
    <div className="flex items-center justify-center flex-1">
      <div className="flex flex-col items-center gap-[16px] max-w-[560px] text-center p-[32px]">
        <div className="text-[18px] font-[600] text-newTextColor">
          This page encountered an error
        </div>
        {error?.message && (
          <div className="text-[13px] text-textItemBlur font-mono bg-newBgColor rounded-[8px] p-[12px] w-full text-left break-all">
            {error.message}
          </div>
        )}
        <div className="flex gap-[12px]">
          <button
            className="px-[20px] py-[8px] bg-btnPrimary text-btnText rounded-[8px] text-[14px] font-[600] hover:opacity-90"
            onClick={() => router.replace('/launches')}
          >
            Go to Launches
          </button>
          <button
            className="px-[20px] py-[8px] bg-btnSimple text-btnText rounded-[8px] text-[14px] font-[600] hover:opacity-90"
            onClick={() => reset()}
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
