'use client';
import { useMemo, useState } from 'react';
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { useClickOutside } from '@mantine/hooks';
import clsx from 'clsx';
import { RepeatIcon, DropdownArrowIcon } from "../ui/icons";
const getList = (t) => [
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
export const RepeatComponent = (props) => {
    const { repeat } = props;
    const t = useT();
    const list = getList(t);
    const [isOpen, setIsOpen] = useState(false);
    const ref = useClickOutside(() => {
        if (!isOpen) {
            return;
        }
        setIsOpen(false);
    });
    const everyLabel = useMemo(() => {
        var _a;
        if (!repeat) {
            return '';
        }
        return (_a = list.find((p) => p.value === repeat)) === null || _a === void 0 ? void 0 : _a.label;
    }, [repeat, list]);
    return (<div ref={ref} className={clsx('border rounded-[8px] justify-center flex items-center relative h-[44px] text-[15px] font-[600] select-none', isOpen ? 'border-[#612BD3]' : 'border-newTextColor/10')}>
      <div onClick={() => setIsOpen(!isOpen)} className="px-[16px] justify-center flex gap-[8px] items-center h-full select-none flex-1">
        <div className="cursor-pointer">
          <RepeatIcon />
        </div>
        <div className="cursor-pointer">
          {repeat
            ? `${t('repeat_post_every_label', 'Repeat Post Every')} ${everyLabel}`
            : t('repeat_post_every', 'Repeat Post Every...')}
        </div>
        <div className="cursor-pointer">
          <DropdownArrowIcon rotated={isOpen}/>
        </div>
      </div>
      {isOpen && (<div className="z-[300] absolute start-0 bottom-[100%] w-[240px] bg-newBgColorInner p-[12px] menu-shadow -translate-y-[10px] flex flex-col">
          {list.map((p) => (<div onClick={() => {
                    props.onChange(Number(p.value));
                    setIsOpen(false);
                }} key={p.label} className="h-[40px] py-[8px] px-[20px] -mx-[12px] hover:bg-newBgColor">
              {p.label}
            </div>))}
        </div>)}
    </div>);
};
//# sourceMappingURL=repeat.component.js.map