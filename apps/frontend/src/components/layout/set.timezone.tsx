'use client';
import dayjs, { ConfigType } from 'dayjs';
import { FC, useEffect } from 'react';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
dayjs.extend(timezone);
dayjs.extend(utc);

const {utc: originalUtc} = dayjs;

dayjs.utc = new Proxy(originalUtc, {
  apply(target, thisArg, args) {
    const result = target.apply(thisArg, args);

    // Attach `.local()` method to the returned Dayjs object
    result.local = function () {
      return result.tz(getTimezone());
    };

    return result;
  },
});

export const getTimezone = () => {
  return localStorage.getItem('timezone') || dayjs.tz.guess();
};

export const newDayjs = (config?: ConfigType) => {
  return dayjs.tz(config, getTimezone());
};

const SetTimezone: FC = () => {
  useEffect(() => {
    if (localStorage.getItem('timezone')) {
      dayjs.tz.setDefault(getTimezone());
    }
  }, []);
  return null;
};

export default SetTimezone;
