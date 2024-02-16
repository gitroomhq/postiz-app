'use client';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import utc from 'dayjs/plugin/utc';

import {createContext, FC, ReactNode, useContext, useState} from 'react';
import dayjs from 'dayjs';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(utc);

const CalendarContext = createContext({
  currentWeek: dayjs().week(),
  integrations: [] as Integrations[],
  setFilters: (filters: { currentWeek: number }) => {},
});

export interface Integrations {
  name: string;
  id: string;
  identifier: string;
  type: string;
  picture: string;
}
export const CalendarWeekProvider: FC<{ children: ReactNode, integrations: Integrations[] }> = ({
  children,
  integrations
}) => {
  const [filters, setFilters] = useState({
      currentWeek: dayjs().week(),
  });
  return (
    <CalendarContext.Provider value={{ ...filters, integrations, setFilters }}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => useContext(CalendarContext);