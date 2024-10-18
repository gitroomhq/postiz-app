import { FC, useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { Calendar, TimeInput } from '@mantine/dates';
import { useClickOutside } from '@mantine/hooks';
import { Button } from '@gitroom/react/form/button';

import { ReactComponent as CalendarSvg } from '@gitroom/frontend/assets/calendar.svg';

export const DatePicker: FC<{
  date: dayjs.Dayjs;
  onChange: (day: dayjs.Dayjs) => void;
}> = (props) => {
  const { date, onChange } = props;
  const [open, setOpen] = useState(false);

  const changeShow = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const ref = useClickOutside<HTMLDivElement>(() => {
    setOpen(false);
  });

  const changeDate = useCallback(
    (type: 'date' | 'time') => (day: Date) => {
      onChange(
        dayjs(
          type === 'time'
            ? date.format('YYYY-MM-DD') + ' ' + dayjs(day).format('HH:mm:ss')
            : dayjs(day).format('YYYY-MM-DD') + ' ' + date.format('HH:mm:ss')
        )
      );
    },
    [date]
  );

  return (
    <div
      className="flex gap-[8px] items-center relative px-[16px] select-none"
      onClick={changeShow}
      ref={ref}
    >
      <div className="cursor-pointer">{date.format('DD/MM/YYYY HH:mm')}</div>
      <div className="cursor-pointer">
        <CalendarSvg />
      </div>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="animate-normalFadeDown absolute top-[100%] mt-[16px] right-0 bg-sixth border border-tableBorder text-textColor rounded-[16px] z-[300] p-[16px] flex flex-col"
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
                return '!text-textColor !bg-seventh !outline-none';
              }

              return '!text-textColor';
            }}
            classNames={{
              day: 'hover:bg-seventh',
              calendarHeaderControl: 'text-textColor hover:bg-third',
              calendarHeaderLevel: 'text-textColor hover:bg-third', // cell: 'child:!text-textColor'
            }}
          />
          <TimeInput
            onChange={changeDate('time')}
            label="Pick time"
            classNames={{
              label: 'text-textColor py-[12px]',
              input:
                'bg-sixth h-[40px] border border-tableBorder text-textColor rounded-[4px] outline-none',
            }}
            defaultValue={date.toDate()}
          />
          <Button className="mt-[12px]" onClick={changeShow}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
};
