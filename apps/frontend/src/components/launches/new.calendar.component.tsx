'use client';
import { Fragment } from 'react';
import { CalendarColumn } from '@gitroom/frontend/components/launches/calendar';
import { DNDProvider } from '@gitroom/frontend/components/launches/helpers/dnd.provider';

export const days = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
export const hours = Array.from({ length: 24 }, (_, i) => i);

export const NewCalendarComponent = () => {
  return (
    <DNDProvider>
      <div className="flex flex-col h-screen overflow-hidden text-textColor flex-1">
        <div className="flex-1">
          <div className="grid grid-cols-8 bg-customColor31 gap-[1px] border-customColor31 border rounded-[10px]">
            <div className="bg-customColor20 sticky top-0 z-10 bg-gray-900"></div>
            {days.map((day, index) => (
              <div
                key={day}
                className="sticky top-0 z-10 bg-customColor20 p-2 text-center"
              >
                <div>{day}</div>
              </div>
            ))}
            {hours.map((hour) => (
              <Fragment key={hour}>
                <div className="p-2 pr-4 bg-secondary text-center items-center justify-center flex">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {days.map((day, indexDay) => (
                  <Fragment key={`${day}-${hour}`}>
                    <div className="relative bg-secondary">
                      <CalendarColumn
                        day={indexDay}
                        hour={`${hour.toString().padStart(2, '0')}:00`}
                      />
                    </div>
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </DNDProvider>
  );
};
