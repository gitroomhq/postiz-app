import React, { Fragment, useMemo } from 'react';
import dayjs from 'dayjs';
import i18next from 'i18next';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { CalendarColumn } from './CalendarColumn';
import { days, hours, convertTimeFormatBasedOnLocality } from '../utils/calendar.utils';

export const WeekView = () => {
    const { currentYear, currentWeek } = useCalendar();
    const t = useT();

    // Use dayjs to get localized day names
    const localizedDays = useMemo(() => {
        const currentLanguage = i18next.resolvedLanguage || 'en';
        dayjs.locale(currentLanguage);

        const days = [];
        const yearWeek = dayjs()
            .year(currentYear)
            .week(currentWeek)
            .startOf('week');
        for (let i = 1; i <= 7; i++) {
            const yearWeekFormat = yearWeek.add(i, 'day').format('L');
            days.push({ name: dayjs().day(i).format('dddd'), day: yearWeekFormat });
        }
        return days;
    }, [i18next.resolvedLanguage, currentYear, currentWeek]);

    return (
        <div className="flex flex-col h-screen overflow-hidden text-textColor flex-1">
            <div className="flex-1">
                <div className="grid grid-cols-8 bg-customColor31 gap-[1px] border-customColor31 border rounded-[10px]">
                    <div className="bg-customColor20 sticky top-0 z-10 bg-gray-900"></div>
                    {localizedDays.map((day) => (
                        <div
                            key={day.name}
                            className="sticky top-0 z-10 bg-customColor20 p-2 text-center"
                        >
                            <div>{day.name}</div>
                            <div className={clsx("text-xs", day.day === dayjs().format('L') && 'text-yellow-300')}>{day.day}</div>
                        </div>
                    ))}
                    {hours.map((hour) => (
                        <Fragment key={hour}>
                            <div className="p-2 pe-4 bg-secondary text-center items-center justify-center flex">
                                {convertTimeFormatBasedOnLocality(hour)}
                            </div>
                            {days.map((day, indexDay) => (
                                <Fragment key={`${currentYear}-${currentWeek}-${day}-${hour}`}>
                                    <div className="relative bg-secondary">
                                        <CalendarColumn
                                            getDate={dayjs()
                                                .year(currentYear)
                                                .week(currentWeek)
                                                .day(indexDay + 1)
                                                .hour(hour)
                                                .startOf('hour')}
                                        />
                                    </div>
                                </Fragment>
                            ))}
                        </Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};
