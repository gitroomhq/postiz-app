'use client';

import React, { FC, useCallback, useEffect, useState } from 'react';
import { DelayIcon } from '@gitroom/frontend/components/ui/icons';
import clsx from 'clsx';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useClickOutside } from '@mantine/hooks';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';

const delayOptions = [
  { value: 1, label: '1m' },
  { value: 2, label: '2m' },
  { value: 5, label: '5m' },
  { value: 10, label: '10m' },
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 60, label: '1h' },
  { value: 120, label: '2h' },
];

export const DelayComponent: FC<{
  currentIndex: number;
  currentDelay: number;
}> = ({ currentIndex, currentDelay }) => {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const { referenceRef, floatingRef } = useAnchoredPopover<
    HTMLButtonElement,
    HTMLDivElement
  >(isOpen, 'end', { offsetPx: 10, placement: 'top-end' });

  const isCustomDelay =
    currentDelay > 0 && !delayOptions.some((opt) => opt.value === currentDelay);

  useEffect(() => {
    if (isOpen && isCustomDelay) {
      setCustomValue(String(currentDelay));
    } else if (isOpen && !isCustomDelay) {
      setCustomValue('');
    }
  }, [isOpen, isCustomDelay, currentDelay]);

  const { current, setInternalDelay, setGlobalDelay } = useLaunchStore(
    useShallow((state) => ({
      current: state.current,
      setGlobalDelay: state.setGlobalDelay,
      setInternalDelay: state.setInternalDelay,
    }))
  );

  const ref = useClickOutside(() => {
    if (!isOpen) {
      return;
    }
    setIsOpen(false);
  });

  const setDelay = useCallback(
    (index: number) => (minutes: number) => {
      if (current !== 'global') {
        return setInternalDelay(current, index, minutes);
      }

      return setGlobalDelay(index, minutes);
    },
    [currentIndex, current]
  );

  const handleSelectDelay = useCallback(
    (minutes: number) => {
      setDelay(currentIndex)(minutes);
      setIsOpen(false);
    },
    [currentIndex, setDelay]
  );

  const getCurrentDelayLabel = () => {
    if (!currentDelay) return null;
    const option = delayOptions.find((opt) => opt.value === currentDelay);
    return option?.label || `${currentDelay} min`;
  };

  const delayLabel = getCurrentDelayLabel();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        ref={referenceRef}
        onClick={() => setIsOpen(!isOpen)}
        data-tooltip-id="tooltip"
        data-tooltip-content={
          !currentDelay
            ? t('delay_comment', 'Delay comment')
            : `${t('delay_comment_by', 'Comment delayed by')} ${delayLabel}`
        }
        aria-label={t('delay_comment', 'Delay comment')}
        aria-expanded={isOpen}
        className={clsx(
          'flex h-[24px] cursor-pointer items-center justify-center gap-[3px] rounded-[6px] transition-colors',
          currentDelay > 0
            ? 'bg-pqInner px-[5px] text-pqPink shadow-[inset_0_0_0_1px_var(--pink)]'
            : 'text-pqText hover:text-pqPink'
        )}
      >
        <DelayIcon size={18} />
        {currentDelay > 0 && delayLabel && (
          <span className="text-[10px] font-[700] leading-none">
            {delayLabel}
          </span>
        )}
      </button>
      {isOpen && (
        <div
          ref={floatingRef}
          className="z-[300] flex w-[248px] flex-col gap-[10px] rounded-[14px] bg-pqPop p-[12px] shadow-[var(--e3),inset_0_0_0_1px_var(--border)]"
        >
          <div className="flex items-start gap-[10px]">
            <span className="mt-[1px] grid h-[28px] w-[28px] shrink-0 place-items-center rounded-[8px] bg-pqBrandSoft text-pqBrand">
              <DelayIcon size={16} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <div className="text-[13.5px] font-[600] tracking-[-0.01em] text-pqText">
                {t('delay_comment', 'Delay comment')}
              </div>
              <div className="text-[12px] leading-[1.4] text-pqMuted text-pretty">
                {t(
                  'delay_comment_help',
                  'Wait after the previous post before this publishes.'
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-[5px]">
            {delayOptions.map((option) => (
              <button
                type="button"
                onClick={() => handleSelectDelay(option.value)}
                key={option.value}
                className={clsx(
                  'flex h-[34px] cursor-pointer items-center justify-center rounded-[8px] text-[13px] font-[600] transition-colors',
                  currentDelay === option.value
                    ? 'bg-pqBrand text-pqOnBrand'
                    : 'bg-pqSettings text-pqText hover:bg-pqHover'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex gap-[6px] border-t border-pqLine pt-[10px]">
            <input
              type="number"
              min="1"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder={t('custom_min', 'Custom min')}
              className={clsx(
                'h-[34px] w-full flex-1 rounded-[8px] border-0 bg-pqBg px-[10px] text-[13px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--brand)]',
                isCustomDelay && 'shadow-[inset_0_0_0_1px_var(--brand)]'
              )}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const value = parseInt(customValue, 10);
                if (value > 0) {
                  handleSelectDelay(value);
                  setCustomValue('');
                }
              }}
              className="h-[34px] shrink-0 rounded-[8px] bg-pqBrand px-[14px] text-[12.5px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover"
            >
              {t('set_delay', 'Set')}
            </button>
          </div>

          {currentDelay > 0 && (
            <button
              type="button"
              onClick={() => handleSelectDelay(0)}
              className="h-[32px] w-full rounded-[8px] text-[13px] font-[500] text-pqDanger transition-colors hover:bg-pqDangerSoft"
            >
              {t('remove_delay', 'Remove delay')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
