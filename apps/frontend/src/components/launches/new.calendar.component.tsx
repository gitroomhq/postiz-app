'use client';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@gitroom/react/form/button';
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
      <div className="flex flex-col h-screen bg-[#0f1727] rounded-[10px] overflow-hidden text-white flex-1">
        <div className="flex-1">
          <div className="grid grid-cols-8 bg-gray-800 gap-[2px]">
            <div className="bg-[#121b2c] sticky top-0 z-10 bg-gray-900"></div>
            {days.map((day, index) => (
              <div
                key={day}
                className="sticky top-0 z-10 bg-[#121b2c] p-2 text-center"
              >
                <div>{day}</div>
              </div>
            ))}
            {hours.map((hour) => (
              <Fragment key={hour}>
                <div className="p-2 pr-4 bg-[#090B13] text-center items-center justify-center flex">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {days.map((day, indexDay) => (
                  <Fragment key={`${day}-${hour}`}>
                    <div className="relative bg-[#090b13]">
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
