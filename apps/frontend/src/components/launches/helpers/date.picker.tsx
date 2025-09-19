import { FC, useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { Calendar, TimeInput } from '@mantine/dates';
import { useClickOutside } from '@mantine/hooks';
import { Button } from '@gitroom/react/form/button';
import { isUSCitizen } from './isuscitizen.utils';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
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
      className="flex gap-[8px] items-center relative px-[16px] select-none"
      onClick={changeShow}
      ref={ref}
    >
      <div className="cursor-pointer">
        {date.format(isUSCitizen() ? 'MM/DD/YYYY hh:mm A' : 'DD/MM/YYYY HH:mm')}
      </div>
      <div className="cursor-pointer">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="21"
          viewBox="0 0 20 21"
          fill="none"
        >
          <path
            d="M16.25 3H14.375V2.375C14.375 2.20924 14.3092 2.05027 14.1919 1.93306C14.0747 1.81585 13.9158 1.75 13.75 1.75C13.5842 1.75 13.4253 1.81585 13.3081 1.93306C13.1908 2.05027 13.125 2.20924 13.125 2.375V3H6.875V2.375C6.875 2.20924 6.80915 2.05027 6.69194 1.93306C6.57473 1.81585 6.41576 1.75 6.25 1.75C6.08424 1.75 5.92527 1.81585 5.80806 1.93306C5.69085 2.05027 5.625 2.20924 5.625 2.375V3H3.75C3.41848 3 3.10054 3.1317 2.86612 3.36612C2.6317 3.60054 2.5 3.91848 2.5 4.25V16.75C2.5 17.0815 2.6317 17.3995 2.86612 17.6339C3.10054 17.8683 3.41848 18 3.75 18H16.25C16.5815 18 16.8995 17.8683 17.1339 17.6339C17.3683 17.3995 17.5 17.0815 17.5 16.75V4.25C17.5 3.91848 17.3683 3.60054 17.1339 3.36612C16.8995 3.1317 16.5815 3 16.25 3ZM16.25 6.75H3.75V4.25H5.625V4.875C5.625 5.04076 5.69085 5.19973 5.80806 5.31694C5.92527 5.43415 6.08424 5.5 6.25 5.5C6.41576 5.5 6.57473 5.43415 6.69194 5.31694C6.80915 5.19973 6.875 5.04076 6.875 4.875V4.25H13.125V4.875C13.125 5.04076 13.1908 5.19973 13.3081 5.31694C13.4253 5.43415 13.5842 5.5 13.75 5.5C13.9158 5.5 14.0747 5.43415 14.1919 5.31694C14.3092 5.19973 14.375 5.04076 14.375 4.875V4.25H16.25V6.75Z"
            fill="#B69DEC"
          />
        </svg>
      </div>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="animate-normalFadeDown absolute top-[100%] mt-[16px] end-0 bg-sixth border border-tableBorder text-textColor rounded-[16px] z-[300] p-[16px] flex flex-col"
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
            {t('save', 'Save')}
          </Button>
        </div>
      )}
    </div>
  );
};
