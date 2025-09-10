'use client';

import React from 'react';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/he';
import 'dayjs/locale/ru';
import 'dayjs/locale/zh';
import 'dayjs/locale/fr';
import 'dayjs/locale/es';
import 'dayjs/locale/pt';
import 'dayjs/locale/de';
import 'dayjs/locale/it';
import 'dayjs/locale/ja';
import 'dayjs/locale/ko';
import 'dayjs/locale/ar';
import 'dayjs/locale/tr';
import 'dayjs/locale/vi';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { extend } from 'dayjs';
import i18next from 'i18next';
import { DayView } from './components/DayView';
import { WeekView } from './components/WeekView';
import { MonthView } from './components/MonthView';
import { updateDayjsLocale } from './utils/calendar.utils';

// Extend dayjs with necessary plugins
extend(isSameOrAfter);
extend(isSameOrBefore);
extend(localizedFormat);

// Set dayjs locale whenever i18next language changes
i18next.on('languageChanged', updateDayjsLocale);

// Initial setup
updateDayjsLocale();

export const Calendar = () => {
    const { display } = useCalendar();

    return (
        <>
            {display === 'day' ? (
                <DayView />
            ) : display === 'week' ? (
                <WeekView />
            ) : (
                <MonthView />
            )}
        </>
    );
};
