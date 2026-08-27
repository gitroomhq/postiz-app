'use client';
import dayjs, { ConfigType, Dayjs } from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.extend(relativeTime);

const WALL_CLOCK = 'YYYY-MM-DDTHH:mm:ss';

// The user timezone is a display lens: it is never persisted into a datetime.
// Every datetime is converted once when it crosses the API boundary
// (`fromUtc` / `toUtc`), and the rest of the app keeps working on plain
// machine-local dayjs objects carrying the user timezone wall clock, so render
// loops never pay the `Intl` cost of a timezone-aware dayjs.
// `null` means "auto" - every helper degenerates to plain machine-local dayjs.
let userTimezone: string | null = null;

// The same publish dates are converted once per calendar cell, so keep the
// conversions O(number of API datetimes) instead of O(rendered cells).
const displayCache = new Map<string, Dayjs>();
let now: { at: number; value: Dayjs } | null = null;

export const setUserTimezone = (timezoneName: string | null) => {
  if (timezoneName === userTimezone) {
    return;
  }
  userTimezone = timezoneName;
  displayCache.clear();
  now = null;
};

export const getTimezone = () => userTimezone || dayjs.tz.guess();

// Read boundary: a UTC instant from the API becomes a plain machine-local
// dayjs carrying the user timezone wall clock.
export const fromUtc = (value: ConfigType) => {
  if (!userTimezone) {
    return dayjs.utc(value).local();
  }

  if (typeof value !== 'string') {
    return dayjs(dayjs.utc(value).tz(userTimezone).format(WALL_CLOCK));
  }

  const cached = displayCache.get(value);
  if (cached) {
    return cached;
  }

  if (displayCache.size > 5000) {
    displayCache.clear();
  }

  const display = dayjs(dayjs.utc(value).tz(userTimezone).format(WALL_CLOCK));
  displayCache.set(value, display);
  return display;
};

// Write boundary: the exact inverse of `fromUtc` - a wall clock the user typed
// (or dragged to) becomes the real instant, in UTC mode.
export const toUtc = (value: Dayjs) => {
  if (!userTimezone) {
    return value.utc();
  }

  return dayjs.tz(value.format(WALL_CLOCK), userTimezone).utc();
};

export const newDayjs = (config?: ConfigType) => {
  if (config !== undefined || !userTimezone) {
    return dayjs(config);
  }

  // "now" is compared against shifted datetimes, so it has to be shifted too.
  // It is read once per calendar cell, hence the one second window.
  const at = Date.now();
  if (!now || at - now.at > 1000) {
    now = { at, value: dayjs(dayjs().tz(userTimezone).format(WALL_CLOCK)) };
  }

  return now.value;
};
