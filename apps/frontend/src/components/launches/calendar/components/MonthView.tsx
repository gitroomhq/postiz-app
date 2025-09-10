import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import i18next from 'i18next';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { CalendarColumn } from './CalendarColumn';

export const MonthView = () => {
    const { currentYear, currentMonth } = useCalendar();

    // Use dayjs to get localized day names
    const localizedDays = useMemo(() => {
        const currentLanguage = i18next.resolvedLanguage || 'en';
        dayjs.locale(currentLanguage);

        const days = [];
        // Starting from Monday (1) to Sunday (7)
        for (let i = 1; i <= 7; i++) {
            days.push(dayjs().day(i).format('dddd'));
        }
        return days;
    }, [i18next.resolvedLanguage]);

    const calendarDays = useMemo(() => {
        const startOfMonth = dayjs(new Date(currentYear, currentMonth, 1));

        // Calculate the day offset for Monday (isoWeekday() returns 1 for Monday)
        const startDayOfWeek = startOfMonth.isoWeekday(); // 1 for Monday, 7 for Sunday
        const daysBeforeMonth = startDayOfWeek - 1; // Days to show from the previous month

        // Get the start date (Monday of the first week that includes this month)
        const startDate = startOfMonth.subtract(daysBeforeMonth, 'day');

        // Create an array to hold the calendar days (6 weeks * 7 days = 42 days max)
        const calendarDays = [];
        let currentDay = startDate;
        for (let i = 0; i < 42; i++) {
            let label = 'current-month';
            if (currentDay.month() < currentMonth) label = 'previous-month';
            if (currentDay.month() > currentMonth) label = 'next-month';
            calendarDays.push({
                day: currentDay,
                label,
            });

            // Move to the next day
            currentDay = currentDay.add(1, 'day');
        }
        return calendarDays;
    }, [currentYear, currentMonth]);

    return (
        <div className="flex flex-col h-screen overflow-hidden text-textColor flex-1">
            <div className="flex-1 flex">
                <div className="grid grid-cols-7 grid-rows-[40px_auto] bg-customColor31 gap-[1px] border-customColor31 border rounded-[10px] flex-1">
                    {localizedDays.map((day) => (
                        <div
                            key={day}
                            className="sticky top-0 z-10 bg-customColor20 p-2 text-center"
                        >
                            <div>{day}</div>
                        </div>
                    ))}
                    {calendarDays.map((date, index) => (
                        <div
                            key={index}
                            className="bg-secondary text-center items-center justify-center flex min-h-[100px]"
                        >
                            <CalendarColumn
                                getDate={dayjs(date.day).endOf('day')}
                                randomHour={true}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
