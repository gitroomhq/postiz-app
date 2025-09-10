import { createContext, useContext } from 'react';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';

export interface Integrations extends Integration {
    time: Array<{
        time: number;
    }>;
}

interface CalendarContextType {
    integrations: Integrations[];
    posts: any[];
    trendings: string[];
    currentYear: number;
    currentMonth: number;
    currentDay: number;
    currentWeek: number;
    display: 'day' | 'week' | 'month';
    changeDate: (id: string, date: dayjs.Dayjs) => void;
    reloadCalendarView: () => void;
    sets: any[];
    signature: {
        id: string;
        content: string;
    } | null;
}

export const CalendarContext = createContext<CalendarContextType | null>(null);

export const useCalendar = () => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error('useCalendar must be used within a CalendarProvider');
    }
    return context;
};
