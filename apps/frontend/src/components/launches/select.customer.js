'use client';
import { uniqBy } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import clsx from 'clsx';
import { useClickOutside } from '@mantine/hooks';
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import { useLaunchStore } from "../new-launch/store";
import { useShallow } from 'zustand/react/shallow';
import { UserIcon, DropdownArrowIcon } from "../ui/icons";
export const SelectCustomer = (props) => {
    const { onChange, integrations, customer: currentCustomer } = props;
    const { setCurrent } = useLaunchStore(useShallow((state) => ({
        setCurrent: state.setCurrent,
    })));
    const toaster = useToaster();
    const t = useT();
    const [customer, setCustomer] = useState(currentCustomer || '');
    const [pos, setPos] = useState({});
    const [open, setOpen] = useState(false);
    const ref = useClickOutside(() => {
        if (open) {
            setOpen(false);
        }
    });
    const openClose = useCallback(() => {
        var _a;
        if (open) {
            setOpen(false);
            return;
        }
        const { x, y, width, height } = (_a = ref.current) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
        setPos({ top: y + height, left: x });
        setOpen(true);
    }, [open]);
    const totalCustomers = useMemo(() => {
        return uniqBy(integrations, (i) => { var _a; return (_a = i === null || i === void 0 ? void 0 : i.customer) === null || _a === void 0 ? void 0 : _a.id; }).length;
    }, [integrations]);
    if (totalCustomers <= 1) {
        return null;
    }
    return (<div className="relative select-none z-[500]" ref={ref}>
      <div data-tooltip-id="tooltip" data-tooltip-content={t('select_customer_tooltip', 'Select Customer')} onClick={openClose} className={clsx('relative z-[20] cursor-pointer h-[42px] rounded-[8px] pl-[16px] pr-[12px] gap-[8px] border flex items-center', open ? 'border-[#612BD3]' : 'border-newColColor')}>
        <div>
          <UserIcon />
        </div>
        <div>
          <DropdownArrowIcon rotated={open}/>
        </div>
      </div>
      {open && (<div style={pos} className="flex flex-col fixed pt-[12px] bg-newBgColorInner menu-shadow min-w-[250px]">
          <div className="text-[14px] font-[600] px-[12px] mb-[5px]">
            {t('customers', 'Customers')}
          </div>
          {uniqBy(integrations, (u) => { var _a; return (_a = u === null || u === void 0 ? void 0 : u.customer) === null || _a === void 0 ? void 0 : _a.name; })
                .filter((f) => { var _a; return (_a = f.customer) === null || _a === void 0 ? void 0 : _a.name; })
                .map((p) => {
                var _a, _b;
                return (<div onClick={() => {
                        var _a, _b;
                        toaster.show(t('customer_socials_selected', 'Customer socials selected'), 'success');
                        setCustomer((_a = p.customer) === null || _a === void 0 ? void 0 : _a.id);
                        onChange((_b = p.customer) === null || _b === void 0 ? void 0 : _b.id);
                        setOpen(false);
                        setCurrent('global');
                    }} key={(_a = p.customer) === null || _a === void 0 ? void 0 : _a.id} className="p-[12px] hover:bg-newBgColor text-[14px] font-[500] h-[32px] flex items-center">
                {(_b = p.customer) === null || _b === void 0 ? void 0 : _b.name}
              </div>);
            })}
        </div>)}
    </div>);
};
//# sourceMappingURL=select.customer.js.map