'use client';

import React, { FC, useCallback } from 'react';
import { DelayIcon } from '@gitroom/frontend/components/ui/icons';
import clsx from 'clsx';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const DelayComponent: FC<{
  currentIndex: number;
  currentDelay: number;
}> = ({ currentIndex, currentDelay }) => {
  const t = useT();
  const { current, setInternalDelay, setGlobalDelay } = useLaunchStore(
    useShallow((state) => ({
      current: state.current,
      setGlobalDelay: state.setGlobalDelay,
      setInternalDelay: state.setInternalDelay,
    }))
  );

  const setDelay = useCallback(
    (index: number) => (minutes: number) => {
      if (current !== 'global') {
        return setInternalDelay(current, index, minutes);
      }

      return setGlobalDelay(index, minutes);
    },
    [currentIndex, current]
  );

  return (
    <DelayIcon
      // move it into the modal
      onClick={() => setDelay(currentIndex)(100)}
      data-tooltip-id="tooltip"
      data-tooltip-content={
        !currentDelay
          ? t('delay_comment', 'Delay comment')
          : `Comment delayed by ${currentDelay} minutes`
      }
      className={clsx(
        'cursor-pointer',
        currentDelay > 0 && 'bg-[#D82D7E] text-white rounded-full'
      )}
    />
  );
};
