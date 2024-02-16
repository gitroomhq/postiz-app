'use client';

import { FC, useCallback, useMemo } from 'react';
import {
  useCalendar,
} from '@gitroom/frontend/components/launches/calendar.context';
import dayjs from 'dayjs';
import { useModals } from '@mantine/modals';
import {AddEditModal} from "@gitroom/frontend/components/launches/add.edit.model";
import clsx from "clsx";

const days = [
  '',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const hours = [
  '00:00',
  '01:00',
  '02:00',
  '03:00',
  '04:00',
  '05:00',
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
];

const CalendarColumn: FC<{ day: number; hour: string }> = (props) => {
  const { day, hour } = props;
  const week = useCalendar();
  const modal = useModals();

  const getDate = useMemo(() => {
    const date =
      dayjs().isoWeek(week.currentWeek).isoWeekday(day).format('YYYY-MM-DD') +
      'T' +
      hour +
      ':00';
    return dayjs(date);
  }, [week.currentWeek]);

  const addModal = useCallback(() => {
    modal.openModal({
      closeOnClickOutside: false,
      closeOnEscape: false,
      withCloseButton: false,
      children: (
        <AddEditModal integrations={week.integrations} date={getDate} />
      ),
      size: '80%',
      title: `Adding posts for ${getDate.format('DD/MM/YYYY HH:mm')}`,
    });
  }, []);

  const isBeforeNow = useMemo(() => {
    return getDate.isBefore(dayjs());
  }, [getDate]);

  return (
    <div className={clsx("h-[calc(216px/6)] text-[12px] hover:bg-white/20 pointer flex justify-center items-center", isBeforeNow && 'bg-white/10 pointer-events-none')}>
      <div
        onClick={addModal}
        className="flex-1 h-full flex justify-center items-center"
      >
        {isBeforeNow ? '' : '+ Add'}
      </div>
    </div>
  );
};

export const Calendar = () => {
  return (
    <div>
      <div className="grid grid-cols-8 text-center border-tableBorder border-r">
        {days.map((day) => (
          <div
            className="border-tableBorder border-l border-b h-[36px] border-t flex items-center justify-center bg-input text-[14px] sticky top-0"
            key={day}
          >
            {day}
          </div>
        ))}
        {hours.map((hour) =>
          days.map((day, index) => (
            <>
              {index === 0 ? (
                <div
                  className="border-tableBorder border-l border-b h-[216px]"
                  key={day + hour}
                >
                  {['00', '10', '20', '30', '40', '50'].map((num) => (
                    <div
                      key={day + hour + num}
                      className="h-[calc(216px/6)] text-[12px] flex justify-center items-center"
                    >
                      {hour.split(':')[0] + ':' + num}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="border-tableBorder border-l border-b h-[216px] flex flex-col"
                  key={day + hour}
                >
                  {['00', '10', '20', '30', '40', '50'].map((num) => (
                    <CalendarColumn
                      key={day + hour + num}
                      day={index}
                      hour={hour.split(':')[0] + ':' + num}
                    />
                  ))}
                </div>
              )}
            </>
          ))
        )}
      </div>
    </div>
  );
};
