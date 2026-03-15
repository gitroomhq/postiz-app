'use client';

import { uniqBy } from 'lodash';
import React, { FC, useCallback, useMemo, useRef, useState } from 'react';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';
import { useClickOutside } from '@mantine/hooks';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { UserIcon, DropdownArrowIcon } from '@gitroom/frontend/components/ui/icons';

export const SelectCustomer: FC<{
  onChange: (value: string) => void;
  integrations: Integrations[];
  customer?: string;
}> = (props) => {
  const { onChange, integrations, customer: currentCustomer } = props;
  const { setCurrent } = useLaunchStore(
    useShallow((state) => ({
      setCurrent: state.setCurrent,
    }))
  );
  const toaster = useToaster();
  const t = useT();
  const [customer, setCustomer] = useState(currentCustomer || '');
  const [pos, setPos] = useState<any>({});
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => {
    if (open) {
      setOpen(false);
    }
  });

  const openClose = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }

    const { x, y, width, height } = ref.current?.getBoundingClientRect();
    setPos({ top: y + height, left: x });
    setOpen(true);
  }, [open]);

  const totalCustomers = useMemo(() => {
    return uniqBy(integrations, (i) => i?.customer?.id).length;
  }, [integrations]);
  if (totalCustomers <= 1) {
    return null;
  }

  return (
    <div className="relative select-none z-[500]" ref={ref}>
      <div
        data-tooltip-id="tooltip"
        data-tooltip-content={t('select_customer_tooltip', 'Select Customer')}
        onClick={openClose}
        className={clsx(
          'relative z-[20] cursor-pointer h-[42px] rounded-[12px] pl-[16px] pr-[12px] gap-[8px] border flex items-center bg-[rgba(15,23,42,0.74)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors',
          open ? 'border-sky-400/50 bg-white/[0.06]' : 'border-white/10 hover:border-white/20'
        )}
      >
        <div>
          <UserIcon />
        </div>
        <div>
          <DropdownArrowIcon rotated={open} />
        </div>
      </div>
      {open && (
        <div
          style={pos}
          className="flex flex-col fixed pt-[12px] bg-[rgba(15,23,42,0.96)] backdrop-blur-xl shadow-[0_24px_80px_rgba(2,6,23,0.45)] min-w-[250px] rounded-[16px] border border-white/10 overflow-hidden"
        >
          <div className="text-[14px] font-[600] px-[12px] mb-[5px] pt-[4px]">
            {t('customers', 'Customers')}
          </div>
          {uniqBy(integrations, (u) => u?.customer?.name)
            .filter((f) => f.customer?.name)
            .map((p) => (
              <div
                onClick={() => {
                  toaster.show(
                    t('customer_socials_selected', 'Customer socials selected'),
                    'success'
                  );
                  setCustomer(p.customer?.id);
                  onChange(p.customer?.id);
                  setOpen(false);
                  setCurrent('global')
                }}
                key={p.customer?.id}
                className="p-[12px] hover:bg-white/[0.06] text-[14px] font-[500] h-[40px] flex items-center transition-colors"
              >
                {p.customer?.name}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
