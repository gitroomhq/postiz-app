'use client';

import { FC, useMemo, useRef, useState } from 'react';
import { Select } from '@gitroom/react/form/select';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useClickOutside } from '@mantine/hooks';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import clsx from 'clsx';
import { RepeatIcon, DropdownArrowIcon } from '@gitroom/frontend/components/ui/icons';

const CUSTOM_REPEAT_VALUE = -1;

const UNIT_OPTIONS = [
  { value: 1, label: 'Day(s)' },
  { value: 7, label: 'Week(s)' },
  { value: 30, label: 'Month(s)' },
];

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
    value: CUSTOM_REPEAT_VALUE,
    label: t('custom', 'Custom...')
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
  const [showCustom, setShowCustom] = useState<boolean>(false);
  const [customAmount, setCustomAmount] = useState(1);
  const [customUnit, setCustomUnit] = useState(1); // multiplier: 1=day, 7=week, 30=month
  const inputRef = useRef<HTMLInputElement>(null);

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
    const presetLabel = list.find((p) => p.value === repeat)?.label;
    if (presetLabel) {
      return presetLabel;
    }
    // Custom value: expressed as weeks or months for better readability when possible
    if (repeat % 7 === 0) {
      return `${repeat / 7} Week(s)`;
    }
    if (repeat % 30 === 0) {
      return `${repeat / 30} Month(s)`;
    }
    return `${repeat} Day(s)`;
  }, [repeat, list]);

  const handleItemClick = (value: number | null) => {
    if (value === CUSTOM_REPEAT_VALUE) {
      setShowCustom(true);
      // To directly focus on input after custom panel opens for better UX
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return;
    }
    props.onChange(Number(value));
    setIsOpen(false);
    setShowCustom(false);
  }

  const handleCustomApply = () => {
    if (!customAmount || customAmount < 1) {
      return;
    }
    const totalDays = customAmount * customUnit;
    props.onChange(Number(totalDays));
    setIsOpen(false);
    setShowCustom(false);
  }

  return (
    <div
      ref={ref}
      className={clsx(
        'border rounded-[8px] justify-center flex items-center relative h-[44px] text-[15px] font-[600] select-none',
        isOpen ? 'border-[#612BD3]' : 'border-newTextColor/10',
      )}
    >
      <div
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
        <div className="z-[300] absolute start-0 bottom-[100%] w-[340px] bg-newBgColorInner p-[12px] menu-shadow -translate-y-[10px] flex flex-col">
          {!showCustom && list.map((p) => (
            <div
              onClick={() => handleItemClick(p.value as number | null)}
              key={p.label}
              className={clsx('h-[40px] py-[8px] px-[20px] -mx-[12px] hover:bg-newBgColor', p.value === CUSTOM_REPEAT_VALUE && 'text-[#612BD3] font-[700]')}
            >
              {p.label}
            </div>
          ))}

          {/* Custom Repeat Panel */}
          {showCustom && (
            <div className="flex flex-col gap-[10px]">
              <div className="text-[14px] font-[600] mb-[2px]">
                {t('custom_repeat', 'Custom Repeat Interval')}
              </div>

              {/* Amount + Unit row */}
              <div className="flex gap-[8px] items-center">
                <input
                  ref={inputRef}
                  type="number"
                  min={1}
                  max={999}
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(Number(e.target.value));
                  }}
                  className="w-[70px] h-[36px] rounded-[6px] border bg-newBgColor text-center text-[15px] font-[600] focus:outline-none focus:border-[#612BD3]"
                />
                <div className="flex gap-[4px]">
                  {UNIT_OPTIONS.map((u) => (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => setCustomUnit(u.value)}
                      className={clsx(
                        'h-[36px] px-[10px] rounded-[6px] text-[12px] font-[600] border transition-colors',
                        customUnit === u.value
                          ? 'bg-[#612BD3] border-[#612BD3] text-white'
                          : 'border-newTextColor/20 hover:border-[#612BD3] hover:text-[#612BD3]',
                      )}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {customAmount && (
                <div className="text-[12px] text-newTextColor/50">
                  Every {customAmount} {UNIT_OPTIONS.find(u => u.value === customUnit)?.label} = {customAmount * customUnit} day(s)
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-[8px] mt-[4px]">
                <button
                  type="button"
                  onClick={() => setShowCustom(false)}
                  className="flex-1 h-[34px] rounded-[6px] border border-newTextColor/20 text-[13px] font-[600] hover:bg-newBgColor"
                >
                  {t('back', 'Back')}
                </button>
                <button
                  type="button"
                  onClick={handleCustomApply}
                  disabled={!customAmount || customAmount < 1}
                  className="flex-1 h-[34px] rounded-[6px] bg-[#612BD3] text-white text-[13px] font-[600] disabled:opacity-40 hover:bg-[#4f22a8] transition-colors"
                >
                  {t('apply', 'Apply')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
