'use client';

import React, { FC, ReactNode, useState } from 'react';
import clsx from 'clsx';
import { useClickOutside } from '@mantine/hooks';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  ChevronLeftIcon,
  DropdownArrowIcon,
} from '@gitroom/frontend/components/ui/icons';

export interface MobileTopBarAction {
  label: string;
  variant: 'primary' | 'secondary' | 'tertiary';
  onClick: () => void;
}

const actionColors = {
  primary: 'bg-btnPrimary text-white',
  secondary: 'bg-[#D82D7E] text-white',
  tertiary: 'bg-btnSimple text-btnText',
};

// the composer header on phones, a single action is triggered directly,
// more than one opens a menu
export const MobileTopBar: FC<{
  onBack: () => void;
  actions: MobileTopBarAction[];
  disabled: boolean;
  loading: boolean;
  children: ReactNode;
}> = ({ onBack, actions, disabled, loading, children }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const single = actions.length === 1;

  return (
    <div className="hidden mobile:flex sticky top-0 z-[450] h-[60px] items-center gap-[8px] px-[16px] bg-newBgColorInner select-none">
      <div
        onClick={onBack}
        className="w-[24px] h-[24px] flex justify-center items-center cursor-pointer text-[#A3A3A3]"
      >
        <ChevronLeftIcon strokeWidth={1.5} className="rtl:rotate-180" />
      </div>
      <div className="flex-1 min-w-0 flex">{children}</div>
      <div ref={ref} className="relative">
        <button
          disabled={disabled}
          onClick={() => (single ? actions[0].onClick() : setOpen(!open))}
          className={clsx(
            'relative min-w-[92px] h-[34px] rounded-[6px] flex justify-center items-center gap-[8px] text-[13px] font-[600] bg-btnPrimary text-white disabled:bg-btnSimple disabled:text-textItemBlur disabled:cursor-not-allowed',
            single ? 'px-[16px]' : 'ps-[24px] pe-[12px]'
          )}
        >
          {loading && (
            <div className="absolute left-[50%] top-[50%] -translate-y-[50%] -translate-x-[50%]">
              <div className="animate-spin h-[20px] w-[20px] border-4 border-white border-t-transparent rounded-full" />
            </div>
          )}
          <div className={clsx(loading && 'invisible')}>
            {single ? actions[0].label : t('post', 'Post')}
          </div>
          {!single && (
            <DropdownArrowIcon
              size={16}
              rotated={open}
              className={clsx(loading && 'invisible')}
            />
          )}
        </button>
        {open && (
          <div className="absolute end-0 top-[100%] mt-[8px] w-[228px] p-[12px] flex flex-col gap-[12px] bg-newBgColorInner menu-shadow z-[300]">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  setOpen(false);
                  action.onClick();
                }}
                className={clsx(
                  'h-[34px] rounded-[6px] text-[13px] font-[600]',
                  actionColors[action.variant]
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
