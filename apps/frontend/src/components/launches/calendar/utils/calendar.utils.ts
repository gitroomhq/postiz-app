import dayjs from 'dayjs';
import i18next from 'i18next';
import { isUSCitizen } from '../helpers/isuscitizen.utils';

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

export const updateDayjsLocale = () => {
    const currentLanguage = i18next.resolvedLanguage || 'en';
    dayjs.locale(currentLanguage);
};

export const convertTimeFormatBasedOnLocality = (time: number) => {
    if (isUSCitizen()) {
        return `${time === 12 ? 12 : time % 12}:00 ${time >= 12 ? 'PM' : 'AM'}`;
    } else {
        return `${time}:00`;
    }
};
