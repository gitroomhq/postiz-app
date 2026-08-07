import { FC, useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { Calendar, TimeInput } from '@mantine/dates';
import { useClickOutside } from '@mantine/hooks';
import { Button } from '@gitroom/react/form/button';
import { useDateFormat } from './date.format';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { CalendarIcon } from '@gitroom/frontend/components/ui/icons';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';

export const DatePicker: FC<{
  date: dayjs.Dayjs;
  onChange: (day: dayjs.Dayjs) => void;
}> = (props) => {
  const { date, onChange } = props;
  const [open, setOpen] = useState(false);
  const t = useT();
  const { dateTimePattern } = useDateFormat();
  // Fixed positioning escapes Create Post footer's overflow-y-hidden and the
  // shell's overflow-hidden (absolute bottom-[100%] was clipped behind chrome).
  const { referenceRef, floatingRef } = useAnchoredPopover<
    HTMLDivElement,
    HTMLDivElement
  >(open, 'start', { offsetPx: 16, placement: 'top' });

  const changeShow = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);
  const ref = useClickOutside<HTMLDivElement>(() => {
    setOpen(false);
  });
  const changeDate = useCallback(
    (type: 'date' | 'time') => (day: Date) => {
      onChange(
        newDayjs(
          type === 'time'
            ? date.format('YYYY-MM-DD') + ' ' + newDayjs(day).format('HH:mm:ss')
            : newDayjs(day).format('YYYY-MM-DD') + ' ' + date.format('HH:mm:ss')
        )
      );
    },
    [date]
  );
  return (
    <div
      className="px-[16px] border border-newTextColor/10 rounded-[8px] justify-center flex gap-[8px] items-center relative h-[44px] text-[15px] font-[600] ml-[7px] select-none flex-1"
      ref={ref}
    >
      <div
        className="flex flex-1 cursor-pointer items-center justify-center gap-[8px]"
        onClick={changeShow}
        ref={referenceRef}
      >
        <div>
          <CalendarIcon />
        </div>
        <div>{date.format(dateTimePattern())}</div>
      </div>
      {open && (
        <div
          ref={floatingRef}
          onClick={(e) => e.stopPropagation()}
          className="animate-fadeIn z-[300] flex flex-col rounded-[16px] border border-pqBorder bg-pqPop p-[16px] text-pqText shadow-pqE2"
        >
          <Calendar
            onChange={changeDate('date')}
            value={date.toDate()}
            dayClassName={(date, modifiers) => {
              if (modifiers.weekend) {
                return '!text-customColor28';
              }
              if (modifiers.outside) {
                return '!text-gray';
              }
              if (modifiers.selected) {
                return '!text-pqOnBrand !bg-pqBrand !outline-none';
              }
              return '!text-pqText';
            }}
            classNames={{
              day: 'hover:bg-pqHover',
              calendarHeaderControl: 'text-pqText hover:bg-pqHover',
              calendarHeaderLevel: 'text-pqText hover:bg-pqHover',
            }}
          />
          <TimeInput
            onChange={changeDate('time')}
            label="Pick time"
            classNames={{
              label: 'text-pqMuted py-[12px]',
              input:
                'bg-pqTableHeader h-[40px] border-0 text-pqText rounded-[10px] outline-none shadow-[inset_0_0_0_1px_var(--border)]',
            }}
            defaultValue={date.toDate()}
          />
          <Button className="mt-[12px]" onClick={changeShow}>
            {t('close', 'Close')}
          </Button>
        </div>
      )}
    </div>
  );
};
