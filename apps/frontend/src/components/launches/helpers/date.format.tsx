'use client';

import { useSyncExternalStore } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(localizedFormat);

export type DateOrder = 'MDY' | 'DMY';
export type TimeMetric = 'US' | 'GLOBAL';

type DateFormatSnapshot = {
  dateOrder: DateOrder;
  use12Hour: boolean;
};

const canUseDom = () => typeof window !== 'undefined';

const readDateOrder = (): DateOrder => {
  if (!canUseDom()) {
    return 'MDY';
  }
  const stored = localStorage.getItem('dateFormat');
  if (stored === 'MDY' || stored === 'DMY') {
    return stored;
  }
  // Soft migration: derive from legacy time preference, else navigator.
  const isUS = localStorage.getItem('isUS');
  if (isUS === 'US') {
    return 'MDY';
  }
  if (isUS === 'GLOBAL') {
    return 'DMY';
  }
  const lang = navigator.language || navigator.languages?.[0] || '';
  return lang.startsWith('en-US') ? 'MDY' : 'DMY';
};

const read12Hour = (): boolean => {
  if (!canUseDom()) {
    return true;
  }
  const isUS = localStorage.getItem('isUS');
  if (isUS === 'US') {
    return true;
  }
  if (isUS === 'GLOBAL') {
    return false;
  }
  const lang = navigator.language || navigator.languages?.[0] || '';
  return lang.startsWith('en-US');
};

const applyDayjsLOverride = (order: DateOrder) => {
  const localeKey = dayjs.locale();
  const locale = dayjs.Ls[localeKey] || dayjs.Ls.en;
  if (locale?.formats) {
    locale.formats.L = order === 'MDY' ? 'MM/DD/YYYY' : 'DD/MM/YYYY';
  }
};

let snapshot: DateFormatSnapshot = {
  dateOrder: 'MDY',
  use12Hour: true,
};

const listeners = new Set<() => void>();

const refreshSnapshot = () => {
  const next: DateFormatSnapshot = {
    dateOrder: readDateOrder(),
    use12Hour: read12Hour(),
  };
  if (
    next.dateOrder !== snapshot.dateOrder ||
    next.use12Hour !== snapshot.use12Hour
  ) {
    snapshot = next;
  }
  applyDayjsLOverride(snapshot.dateOrder);
};

const emitChange = () => {
  refreshSnapshot();
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  // Refresh on subscribe so first client paint picks up soft-migrated prefs.
  refreshSnapshot();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => snapshot;

const getServerSnapshot = (): DateFormatSnapshot => ({
  dateOrder: 'MDY',
  use12Hour: true,
});

if (canUseDom()) {
  refreshSnapshot();
}

/** Date order preference (MM/DD/YYYY vs DD/MM/YYYY). Independent of time clock. */
export const getDateOrder = (): DateOrder => readDateOrder();

/**
 * Time-only preference: AM/PM (12h) vs 24-hour.
 * Reads legacy `localStorage.isUS` (`US` | `GLOBAL`). Does not control date order.
 */
export const use12HourClock = (): boolean => read12Hour();

export const setDateFormat = (order: DateOrder) => {
  localStorage.setItem('dateFormat', order);
  emitChange();
};

/** Keep Date Metrics writing `isUS` for the time clock only. */
export const setTimeMetric = (metric: TimeMetric) => {
  localStorage.setItem('isUS', metric);
  emitChange();
};

export const datePattern = (): string =>
  getDateOrder() === 'MDY' ? 'MM/DD/YYYY' : 'DD/MM/YYYY';

export const timePattern = (): string =>
  use12HourClock() ? 'hh:mm A' : 'HH:mm';

export const dateTimePattern = (): string =>
  `${datePattern()} ${timePattern()}`;

export const dateTimeSecondsPattern = (): string =>
  `${datePattern()} ${use12HourClock() ? 'hh:mm:ss A' : 'HH:mm:ss'}`;

export const longDatePattern = (): string =>
  getDateOrder() === 'MDY' ? 'dddd, MMMM D, YYYY' : 'dddd, D MMMM YYYY';

/** Weekday + month day, no year (list range chip). */
export const mediumDatePattern = (): string =>
  getDateOrder() === 'MDY' ? 'dddd, MMMM D' : 'dddd, D MMMM';

/** Month name + day + year (billing / long forms). */
export const longDateNoWeekdayPattern = (): string =>
  getDateOrder() === 'MDY' ? 'MMMM D, YYYY' : 'D MMMM YYYY';

/** Short month + day + year (notifications / trending). */
export const shortDatePattern = (): string =>
  getDateOrder() === 'MDY' ? 'MMM D, YYYY' : 'D MMM YYYY';

export const mediumDateTimePattern = (): string =>
  `${shortDatePattern()} ${use12HourClock() ? 'h:mm A' : 'HH:mm'}`;

export const longDateTimePattern = (): string =>
  `${longDateNoWeekdayPattern()} ${use12HourClock() ? 'h:mm A' : 'HH:mm'}`;

/** Toast / panel style: `Mon · 3:00 PM` or `Mon · 15:00`. */
export const shortWeekdayTimePattern = (): string =>
  `ddd · ${timePattern()}`;

const asDayjs = (value: Dayjs | Date | string | number) =>
  dayjs.isDayjs(value) ? value : dayjs(value);

export const formatDate = (value: Dayjs | Date | string | number) =>
  asDayjs(value).format(datePattern());

export const formatDateTime = (value: Dayjs | Date | string | number) =>
  asDayjs(value).format(dateTimePattern());

export const formatWeekRange = (start: Dayjs, end: Dayjs) =>
  `${start.format(datePattern())} - ${end.format(datePattern())}`;

export const formatLongDate = (value: Dayjs | Date | string | number) =>
  asDayjs(value).format(longDatePattern());

export const formatTime = (value: Dayjs | Date | string | number) =>
  asDayjs(value).format(timePattern());

export const formatShortWeekdayTime = (
  value: Dayjs | Date | string | number
) => asDayjs(value).format(shortWeekdayTimePattern());

/**
 * Subscribe to date-order / clock preference changes so Settings updates
 * re-render the calendar without a full page reload.
 */
export const useDateFormat = () => {
  const snap = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return {
    dateOrder: snap.dateOrder,
    use12Hour: snap.use12Hour,
    datePattern: () =>
      snap.dateOrder === 'MDY' ? 'MM/DD/YYYY' : 'DD/MM/YYYY',
    timePattern: () => (snap.use12Hour ? 'hh:mm A' : 'HH:mm'),
    dateTimePattern: () =>
      `${snap.dateOrder === 'MDY' ? 'MM/DD/YYYY' : 'DD/MM/YYYY'} ${
        snap.use12Hour ? 'hh:mm A' : 'HH:mm'
      }`,
    longDatePattern: () =>
      snap.dateOrder === 'MDY'
        ? 'dddd, MMMM D, YYYY'
        : 'dddd, D MMMM YYYY',
    mediumDatePattern: () =>
      snap.dateOrder === 'MDY' ? 'dddd, MMMM D' : 'dddd, D MMMM',
    longDateNoWeekdayPattern: () =>
      snap.dateOrder === 'MDY' ? 'MMMM D, YYYY' : 'D MMMM YYYY',
    shortDatePattern: () =>
      snap.dateOrder === 'MDY' ? 'MMM D, YYYY' : 'D MMM YYYY',
    mediumDateTimePattern: () =>
      `${snap.dateOrder === 'MDY' ? 'MMM D, YYYY' : 'D MMM YYYY'} ${
        snap.use12Hour ? 'h:mm A' : 'HH:mm'
      }`,
    longDateTimePattern: () =>
      `${snap.dateOrder === 'MDY' ? 'MMMM D, YYYY' : 'D MMMM YYYY'} ${
        snap.use12Hour ? 'h:mm A' : 'HH:mm'
      }`,
    shortWeekdayTimePattern: () =>
      `ddd · ${snap.use12Hour ? 'hh:mm A' : 'HH:mm'}`,
    dateTimeSecondsPattern: () =>
      `${snap.dateOrder === 'MDY' ? 'MM/DD/YYYY' : 'DD/MM/YYYY'} ${
        snap.use12Hour ? 'hh:mm:ss A' : 'HH:mm:ss'
      }`,
    formatDate: (value: Dayjs | Date | string | number) =>
      asDayjs(value).format(
        snap.dateOrder === 'MDY' ? 'MM/DD/YYYY' : 'DD/MM/YYYY'
      ),
    formatDateTime: (value: Dayjs | Date | string | number) =>
      asDayjs(value).format(
        `${snap.dateOrder === 'MDY' ? 'MM/DD/YYYY' : 'DD/MM/YYYY'} ${
          snap.use12Hour ? 'hh:mm A' : 'HH:mm'
        }`
      ),
    formatWeekRange: (start: Dayjs, end: Dayjs) => {
      const pattern = snap.dateOrder === 'MDY' ? 'MM/DD/YYYY' : 'DD/MM/YYYY';
      return `${start.format(pattern)} - ${end.format(pattern)}`;
    },
    formatLongDate: (value: Dayjs | Date | string | number) =>
      asDayjs(value).format(
        snap.dateOrder === 'MDY'
          ? 'dddd, MMMM D, YYYY'
          : 'dddd, D MMMM YYYY'
      ),
    formatTime: (value: Dayjs | Date | string | number) =>
      asDayjs(value).format(snap.use12Hour ? 'hh:mm A' : 'HH:mm'),
    formatShortWeekdayTime: (value: Dayjs | Date | string | number) =>
      asDayjs(value).format(
        `ddd · ${snap.use12Hour ? 'hh:mm A' : 'HH:mm'}`
      ),
    setDateFormat,
    setTimeMetric,
  };
};
