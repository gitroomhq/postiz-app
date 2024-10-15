'use client';
import React, { useCallback, useEffect, useState } from 'react';
import EventEmitter from 'events';
import clsx from 'clsx';

import { ReactComponent as CircleCheckSvg } from '../../../../apps/frontend/src/assets/circle-check.svg';
import { ReactComponent as WarningYellowSvg } from '../../../../apps/frontend/src/assets/warning-y.svg';
import { ReactComponent as GreenBackgroundSvg } from '../../../../apps/frontend/src/assets/green-back.svg';
import { ReactComponent as YellowBackgroundSvg } from '../../../../apps/frontend/src/assets/yellow-back.svg';

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

  return (
    <div
      className={clsx(
        'animate-fadeDown rounded-[8px] gap-[18px] flex items-center overflow-hidden bg-customColor8 p-[16px] min-w-[319px] fixed left-[50%] text-white z-[300] top-[32px] -translate-x-[50%] h-[56px]',
        toasterType === 'success' ? 'shadow-greenToast' : 'shadow-yellowToast'
      )}
    >
      <div>
        {toasterType === 'success' ? <CircleCheckSvg /> : <WarningYellowSvg />}
      </div>
      <div className="flex-1 text-textColor">{toasterText}</div>
      {toasterType === 'success' ? (
        <GreenBackgroundSvg className="absolute top-0 left-0" />
      ) : (
        <YellowBackgroundSvg className="absolute top-0 left-0" />
      )}
    </div>
  );
};

export const useToaster = () => {
  return {
    show: useCallback((text: string, type?: 'success' | 'warning') => {
      toaster.emit('show', { text, type });
    }, []),
  };
};
