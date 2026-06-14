'use client';

import { ChangeEvent, FC, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useClickOutside } from '@mantine/hooks';
import clsx from 'clsx';
import {
  RepeatTimesIcon,
  DropdownArrowIcon,
  CalendarSyncIcon,
} from '@gitroom/frontend/components/ui/icons';
import { DatePicker } from '@gitroom/frontend/components/launches/helpers/date.picker';
import dayjs, { Dayjs } from 'dayjs';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { EndRecurrenceType } from '@prisma/client';

export const EndAfterComponent: FC<{
  type: EndRecurrenceType;
  endAfter: dayjs.Dayjs | number;
  onTypeChange: (type: EndRecurrenceType) => void;
  onEndAfterChange: (value: dayjs.Dayjs | number) => void;
}> = (props) => {
  const { type, endAfter, onTypeChange, onEndAfterChange } = props;

  const t = useT();

  const getButtonText = (type: string) => {
    switch (type) {
      case EndRecurrenceType.NEVER:
        return t('end_never', 'End never');
      case EndRecurrenceType.DATE:
        return t('end_after_date', 'End after date');
      case EndRecurrenceType.POSTS:
        return t('end_after_posts', 'End after no. of posts');
    }
  };

  const [isOpen, setIsOpen] = useState(false);

  const ref = useClickOutside(() => {
    if (!isOpen) {
      return;
    }
    setIsOpen(false);
  });

  const handleEndAfterChange = (
    value: Dayjs | ChangeEvent<HTMLInputElement>
  ) => {
    if (typeof value === 'object' && 'target' in value) {
      onEndAfterChange(+value.target.value);
      return;
    }

    onEndAfterChange(value);
  };

  return (
    <div
      ref={ref}
      className={clsx(
        'border rounded-[8px] justify-center flex items-center relative h-[44px] text-[15px] font-[600] select-none',
        isOpen ? 'border-[#612BD3]' : 'border-newTextColor/10'
      )}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-[16px] justify-center flex gap-[8px] items-center h-full select-none flex-1"
      >
        <div className="cursor-pointer">
          {type === EndRecurrenceType.DATE ? (
            <CalendarSyncIcon />
          ) : type === EndRecurrenceType.POSTS ? (
            <RepeatTimesIcon />
          ) : (
            <></>
          )}
        </div>
        <div className="cursor-pointer">{getButtonText(type)}</div>
        <div className="cursor-pointer">
          <DropdownArrowIcon rotated={isOpen} />
        </div>
      </div>
      {isOpen && (
        <div className="z-[300] absolute start-0 bottom-[100%] w-[150px] bg-newBgColorInner p-[12px] menu-shadow -translate-y-[10px] flex flex-col">
          <div
            className="h-[40px] py-[8px] px-[20px] -mx-[12px] hover:bg-newBgColor"
            onClick={() => {
              onTypeChange(EndRecurrenceType.POSTS);
              setIsOpen(false);
              onEndAfterChange(10);
            }}
          >
            {t('no_of_posts', 'No. of posts')}
          </div>
          <div
            className="h-[40px] py-[8px] px-[20px] -mx-[12px] hover:bg-newBgColor"
            onClick={() => {
              onTypeChange(EndRecurrenceType.DATE);
              setIsOpen(false);
              onEndAfterChange(newDayjs().add(7, 'days'));
            }}
          >
            {t('date', 'Date')}
          </div>
          <div
            className="h-[40px] py-[8px] px-[20px] -mx-[12px] hover:bg-newBgColor"
            onClick={() => {
              onTypeChange(EndRecurrenceType.NEVER);
              setIsOpen(false);
              onEndAfterChange(undefined);
            }}
          >
            {t('never', 'Never')}
          </div>
        </div>
      )}
      {type === EndRecurrenceType.POSTS && (
        <>
          <div className="h-[80%] w-px bg-newTextColor/10"></div>
          <input
            type="number"
            min="2"
            value={typeof endAfter === 'number' ? endAfter : 10}
            onChange={handleEndAfterChange}
            className="w-[100px] px-[16px] h-[42px] rounded-[8px] bg-newBgColorInner text-[14px] text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </>
      )}
      {type === EndRecurrenceType.DATE && (
        <DatePicker
          onChange={handleEndAfterChange}
          date={
            typeof endAfter === 'number' ? newDayjs().add(7, 'days') : endAfter
          }
          minDate={newDayjs().add(1, 'day')}
          view="icon"
        />
      )}
    </div>
  );
};
