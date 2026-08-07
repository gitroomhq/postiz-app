'use client';

import { uniqBy } from 'lodash';
import React, { FC, useCallback, useMemo, useState } from 'react';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';
import { useClickOutside } from '@mantine/hooks';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { UserIcon, DropdownArrowIcon } from '@gitroom/frontend/components/ui/icons';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';

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
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => {
    if (open) {
      setOpen(false);
    }
  });
  const { referenceRef, floatingRef } = useAnchoredPopover<
    HTMLDivElement,
    HTMLDivElement
  >(open, 'end', { offsetPx: 8, placement: 'bottom-end' });

  const openClose = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const totalCustomers = useMemo(() => {
    return uniqBy(integrations, (i) => i?.customer?.id).length;
  }, [integrations]);
  if (totalCustomers <= 1) {
    return null;
  }

  return (
    <div className="relative z-[500] select-none" ref={ref}>
      <div
        ref={referenceRef}
        data-tooltip-id="tooltip"
        data-tooltip-content={t('select_customer_tooltip', 'Select Customer')}
        onClick={openClose}
        className={clsx(
          'relative z-[20] flex h-[42px] cursor-pointer items-center gap-[8px] rounded-[8px] border pl-[16px] pr-[12px]',
          open ? 'border-pqBrand' : 'border-newColColor'
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
          ref={floatingRef}
          className="z-[300] flex min-w-[250px] flex-col bg-pqInner pt-[12px] menu-shadow"
        >
          <div className="mb-[5px] px-[12px] text-[14px] font-[600]">
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
                  setCurrent('global');
                }}
                key={p.customer?.id}
                className="flex h-[32px] items-center p-[12px] text-[14px] font-[500] hover:bg-pqBg"
              >
                {p.customer?.name}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
