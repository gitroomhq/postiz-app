'use client';

import { useCallback, useEffect, useState } from 'react';
import EventEmitter from 'events';
import clsx from 'clsx';
const toaster = new EventEmitter();
export const Toaster = () => {
  const [showToaster, setShowToaster] = useState(false);
  const [toasterText, setToasterText] = useState('');
  const [toasterType, setToasterType] = useState<'success' | 'warning' | ''>(
    ''
  );
  useEffect(() => {
    toaster.on(
      'show',
      (params: { text: string; type?: 'success' | 'warning' }) => {
        const { text, type } = params;
        setToasterText(text);
        setToasterType(type || 'success');
        setShowToaster(true);
        setTimeout(() => {
          setShowToaster(false);
        }, 4200);
      }
    );
    return () => {
      toaster.removeAllListeners();
    };
  }, []);
  if (!showToaster) {
    return <></>;
  }
  const success = toasterType === 'success';
  return (
    // Above the modal stack, which tops out around z-300 — a toast fired from
    // inside a dialog has to be readable.
    <div
      className="animate-pqFadeDown fixed start-[50%] top-[20px] z-[900] flex min-w-[260px] max-w-[460px] -translate-x-[50%] items-center gap-[11px] rounded-[12px] bg-pqPop py-[12px] pe-[16px] ps-[13px] shadow-pqToast"
    >
      <span
        className={clsx(
          'grid size-[22px] shrink-0 place-items-center rounded-full',
          success ? 'bg-pqOkSoft text-pqOk' : 'bg-pqAmberSoft text-pqAmber'
        )}
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
          <path
            d={success ? 'M5 12.5l4.5 4.5L19 7.5' : 'M12 8v5M12 16.5h.01'}
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="flex-1 text-[13.5px] font-[500] leading-[1.45] text-pqText">
        {toasterText}
      </div>
    </div>
  );
};
export const useToaster = () => {
  return {
    show: useCallback((text: string, type?: 'success' | 'warning') => {
      toaster.emit('show', {
        text,
        type,
      });
    }, []),
  };
};
