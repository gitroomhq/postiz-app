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
  list?: boolean;
}> = (props) => {
  const { onChange, integrations, customer: currentCustomer, list } = props;
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

  const selectCustomer = useCallback(
    (id: string) => () => {
      toaster.show(
        t('customer_socials_selected', 'Customer socials selected'),
        'success'
      );
      setCustomer(id);
      onChange(id);
      setOpen(false);
      setCurrent('global');
    },
    [onChange]
  );

  if (totalCustomers <= 1) {
    return null;
  }

  const customers = uniqBy(integrations, (u) => u?.customer?.name).filter(
    (f) => f.customer?.name
  );

  if (list) {
    return (
      <div className="flex flex-col gap-[8px] pb-[16px]">
        <div className="text-[14px] font-[600] text-textItemBlur">
          {t('customers', 'Customers')}
        </div>
        {customers.map((p) => {
          const selected = customer === p.customer?.id;
          return (
            <div
              onClick={selectCustomer(p.customer?.id)}
              key={p.customer?.id}
              className="min-h-[48px] flex items-center justify-between gap-[12px] cursor-pointer select-none"
            >
              <div className="text-[14px] font-[600] truncate">
                {p.customer?.name}
              </div>
              <div
                className={clsx(
                  'w-[24px] h-[24px] min-w-[24px] rounded-full border-[1.5px] flex justify-center items-center',
                  selected ? 'border-[#FC69FF]' : 'border-newTextColor/20'
                )}
              >
                {selected && (
                  <div className="w-[12px] h-[12px] rounded-full bg-[#FC69FF]" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative select-none z-[500]" ref={ref}>
      <div
        data-tooltip-id="tooltip"
        data-tooltip-content={t('select_customer_tooltip', 'Select Customer')}
        onClick={openClose}
        className={clsx(
          'relative z-[20] cursor-pointer h-[42px] rounded-[8px] pl-[16px] pr-[12px] gap-[8px] border flex items-center',
          open ? 'border-[#612BD3]' : 'border-newColColor'
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
          className="flex flex-col fixed pt-[12px] bg-newBgColorInner menu-shadow min-w-[250px]"
        >
          <div className="text-[14px] font-[600] px-[12px] mb-[5px]">
            {t('customers', 'Customers')}
          </div>
          {customers.map((p) => (
            <div
              onClick={selectCustomer(p.customer?.id)}
              key={p.customer?.id}
              className="p-[12px] hover:bg-newBgColor text-[14px] font-[500] h-[32px] flex items-center"
            >
              {p.customer?.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
