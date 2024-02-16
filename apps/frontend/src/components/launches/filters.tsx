"use client";
import {useCalendar} from "@gitroom/frontend/components/launches/calendar.context";
import dayjs from "dayjs";

export const Filters = () => {
  const week = useCalendar();
  const betweenDates = dayjs().isoWeek(week.currentWeek).startOf('isoWeek').format('DD/MM/YYYY') + ' - ' + dayjs().isoWeek(week.currentWeek).endOf('isoWeek').format('DD/MM/YYYY');
  return <div className="text-white h-[50px]" onClick={() => week.setFilters({currentWeek: week.currentWeek + 1})}>Week {week.currentWeek} ({betweenDates})</div>;
};
