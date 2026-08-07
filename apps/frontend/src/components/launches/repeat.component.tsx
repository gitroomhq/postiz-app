'use client';

import { FC, useMemo, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useClickOutside } from '@mantine/hooks';
import clsx from 'clsx';
import { RepeatIcon, DropdownArrowIcon } from '@gitroom/frontend/components/ui/icons';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';

const getList = (t: (key: string, fallback: string) => string) => [
  {
    value: 1,
    label: t('day', 'Day'),
  },
  {
    value: 2,
    label: t('two_days', 'Two Days'),
  },
  {
    value: 3,
    label: t('three_days', 'Three Days'),
  },
  {
    value: 4,
    label: t('four_days', 'Four Days'),
  },
  {
    value: 5,
    label: t('five_days', 'Five Days'),
  },
  {
    value: 6,
    label: t('six_days', 'Six Days'),
  },
  {
    value: 7,
    label: t('week', 'Week'),
  },
  {
    value: 14,
    label: t('two_weeks', 'Two Weeks'),
  },
  {
    value: 30,
    label: t('month', 'Month'),
  },
  {
    value: null,
    label: t('cancel', 'Cancel'),
  },
];
export const RepeatComponent: FC<{
  repeat: number | null;
  onChange: (newVal: number) => void;
}> = (props) => {
  const { repeat } = props;
  const t = useT();
  const list = getList(t);
  const [isOpen, setIsOpen] = useState(false);
  // Same overflow escape as DatePicker / Delay — footer clips absolute menus.
  const { referenceRef, floatingRef } = useAnchoredPopover<
    HTMLDivElement,
    HTMLDivElement
  >(isOpen, 'start', { offsetPx: 10, placement: 'top-start' });

  const ref = useClickOutside(() => {
    if (!isOpen) {
      return;
    }
    setIsOpen(false);
  });

  const everyLabel = useMemo(() => {
    if (!repeat) {
      return '';
    }
    return list.find((p) => p.value === repeat)?.label;
  }, [repeat, list]);

  return (
    <div
      ref={ref}
      className={clsx(
        'border rounded-[8px] justify-center flex items-center relative h-[44px] text-[15px] font-[600] select-none',
        isOpen ? 'border-pqBrand' : 'border-newTextColor/10'
      )}
    >
      <div
        ref={referenceRef}
        onClick={() => setIsOpen(!isOpen)}
        className="px-[16px] justify-center flex gap-[8px] items-center h-full select-none flex-1"
      >
        <div className="cursor-pointer">
          <RepeatIcon />
        </div>
        <div className="cursor-pointer">
          {repeat
            ? `${t('repeat_post_every_label', 'Repeat Post Every')} ${everyLabel}`
            : t('repeat_post_every', 'Repeat Post Every...')}
        </div>
        <div className="cursor-pointer">
          <DropdownArrowIcon rotated={isOpen} />
        </div>
      </div>
      {isOpen && (
        <div
          ref={floatingRef}
          className="z-[300] flex w-[240px] flex-col bg-newBgColorInner p-[12px] menu-shadow"
        >
          {list.map((p) => (
            <div
              onClick={() => {
                props.onChange(Number(p.value));
                setIsOpen(false);
              }}
              key={p.label}
              className="h-[40px] py-[8px] px-[20px] -mx-[12px] hover:bg-newBgColor"
            >
              {p.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
