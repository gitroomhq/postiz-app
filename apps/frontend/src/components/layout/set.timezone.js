'use client';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
dayjs.extend(timezone);
dayjs.extend(utc);
const { utc: originalUtc } = dayjs;
export const getTimezone = () => {
    if (typeof window === 'undefined') {
        return dayjs.tz.guess();
    }
    return localStorage.getItem('timezone') || dayjs.tz.guess();
};
export const newDayjs = (config) => {
    return dayjs(config);
};
const SetTimezone = () => {
    useEffect(() => {
        dayjs.utc = (config, format, strict) => {
            const result = originalUtc(config, format, strict);
            // Attach `.local()` method to the returned Dayjs object
            result.local = function () {
                return result.tz(getTimezone());
            };
            return result;
        };
        if (localStorage.getItem('timezone')) {
            dayjs.tz.setDefault(getTimezone());
        }
    }, []);
    return null;
};
export default SetTimezone;
//# sourceMappingURL=set.timezone.js.map