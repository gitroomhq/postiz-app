import { FC, useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { Calendar, TimeInput } from '@mantine/dates';
import { useClickOutside } from '@mantine/hooks';
import { Button } from '@gitroom/react/form/button';
import { isUSCitizen } from './isuscitizen.utils';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { CalendarIcon } from '@gitroom/frontend/components/ui/icons';
export const DatePicker: FC<{
  date: dayjs.Dayjs;
  onChange: (day: dayjs.Dayjs) => void;
}> = (props) => {
  const { date, onChange } = props;
  const [open, setOpen] = useState(false);
  const t = useT();

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
      className="px-[16px] border border-newTextColor/10 rounded-[8px] justify-center flex gap-[8px] items-center relative h-[44px] text-[13px] md:text-[15px] font-[600] ml-[7px] md:ml-[0] select-none flex-1 w-full min-w-0 max-w-full"
      onClick={changeShow}
      ref={ref}
    >
      <div className="cursor-pointer flex-shrink-0">
        <CalendarIcon />
      </div>
      <div className="cursor-pointer truncate">
        {date.format(isUSCitizen() ? 'MM/DD/YYYY hh:mm A' : 'DD/MM/YYYY HH:mm')}
      </div>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="animate-fadeIn absolute bottom-[100%] md:bottom-auto md:top-[100%] mb-[16px] md:mt-[16px] start-[50%] md:start-auto md:end-0 md:translate-x-0 -translate-x-[50%] bg-sixth border border-tableBorder text-textColor rounded-[16px] z-[300] p-[16px] flex flex-col max-w-[90vw] md:max-w-[400px] w-[calc(100vw-32px)] md:w-auto"
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
                return '!text-white !bg-seventh !outline-none';
              }
              return '!text-textColor';
            }}
            classNames={{
              day: 'hover:bg-seventh text-[12px] md:text-[14px]',
              calendarHeaderControl: 'text-textColor hover:bg-third',
              calendarHeaderLevel: 'text-textColor hover:bg-third',
            }}
          />
          <TimeInput
            onChange={changeDate('time')}
            label="Pick time"
            classNames={{
              label: 'text-textColor py-[12px] text-[12px] md:text-[14px]',
              input:
                'bg-sixth h-[40px] border border-tableBorder text-textColor rounded-[4px] outline-none text-[12px] md:text-[14px]',
            }}
            defaultValue={date.toDate()}
          />
          <Button className="mt-[12px] w-full text-[12px] md:text-[14px]" onClick={changeShow}>
            {t('close', 'Close')}
          </Button>
        </div>
      )}
    </div>
  );
};
