import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type RecurrenceInput = {
  anchorDate: Date | string;
  intervalInDays: number;
  fromDate: Date | string;
  timezone?: string | null;
};

type RecurrenceRangeInput = {
  anchorDate: Date | string;
  intervalInDays: number;
  rangeStart: Date | string;
  rangeEnd: Date | string;
  timezone?: string | null;
};

export const isValidIanaTimezone = (
  timezoneValue?: string | null
): timezoneValue is string => {
  if (!timezoneValue) {
    return false;
  }

  try {
    Intl.DateTimeFormat('en-US', {
      timeZone: timezoneValue,
    });
    return true;
  } catch {
    return false;
  }
};

const getNextLegacyOccurrenceDate = ({
  anchorDate,
  intervalInDays,
  fromDate,
}: Omit<RecurrenceInput, 'timezone'>) => {
  const anchorUtc = dayjs.utc(anchorDate);
  const fromUtc = dayjs.utc(fromDate);

  if (anchorUtc.isAfter(fromUtc)) {
    return anchorUtc.toDate();
  }

  const stepInMilliseconds = intervalInDays * DAY_IN_MS;
  const passed = fromUtc.diff(anchorUtc, 'millisecond');
  const steps = Math.floor(passed / stepInMilliseconds) + 1;

  return anchorUtc.add(intervalInDays * steps, 'day').toDate();
};

export const getNextRecurringOccurrenceDate = ({
  anchorDate,
  intervalInDays,
  fromDate,
  timezone: timezoneValue,
}: RecurrenceInput): Date => {
  if (!intervalInDays || intervalInDays < 1) {
    return dayjs.utc(anchorDate).toDate();
  }

  if (!isValidIanaTimezone(timezoneValue)) {
    return getNextLegacyOccurrenceDate({
      anchorDate,
      intervalInDays,
      fromDate,
    });
  }

  const anchorLocal = dayjs.utc(anchorDate).tz(timezoneValue);
  const fromLocal = dayjs.utc(fromDate).tz(timezoneValue);

  let candidateLocal = anchorLocal;

  if (!candidateLocal.isAfter(fromLocal)) {
    const diffInDays = fromLocal
      .startOf('day')
      .diff(anchorLocal.startOf('day'), 'day');
    const jumps = Math.max(0, Math.floor(diffInDays / intervalInDays));

    candidateLocal = anchorLocal.add(jumps * intervalInDays, 'day');

    while (!candidateLocal.isAfter(fromLocal)) {
      candidateLocal = candidateLocal.add(intervalInDays, 'day');
    }
  }

  return candidateLocal.utc().toDate();
};

export const listRecurringOccurrencesInRange = ({
  anchorDate,
  intervalInDays,
  rangeStart,
  rangeEnd,
  timezone: timezoneValue,
}: RecurrenceRangeInput): Date[] => {
  if (!intervalInDays || intervalInDays < 1) {
    return [];
  }

  const startUtc = dayjs.utc(rangeStart);
  const endUtc = dayjs.utc(rangeEnd);
  if (endUtc.isBefore(startUtc)) {
    return [];
  }

  if (!isValidIanaTimezone(timezoneValue)) {
    let current = dayjs.utc(anchorDate);
    const output: Date[] = [];

    while (current.isBefore(startUtc)) {
      current = current.add(intervalInDays, 'day');
    }

    while (!current.isAfter(endUtc)) {
      output.push(current.toDate());
      current = current.add(intervalInDays, 'day');
    }

    return output;
  }

  const anchorLocal = dayjs.utc(anchorDate).tz(timezoneValue);
  let currentLocal = anchorLocal;

  const startUtcMs = startUtc.valueOf();
  const endUtcMs = endUtc.valueOf();

  const startLocal = dayjs.utc(rangeStart).tz(timezoneValue);
  if (currentLocal.utc().valueOf() < startUtcMs) {
    const diffInDays = startLocal
      .startOf('day')
      .diff(anchorLocal.startOf('day'), 'day');
    const jumps = Math.max(0, Math.floor(diffInDays / intervalInDays));
    currentLocal = anchorLocal.add(jumps * intervalInDays, 'day');

    while (currentLocal.utc().valueOf() < startUtcMs) {
      currentLocal = currentLocal.add(intervalInDays, 'day');
    }
  }

  const output: Date[] = [];
  while (currentLocal.utc().valueOf() <= endUtcMs) {
    output.push(currentLocal.utc().toDate());
    currentLocal = currentLocal.add(intervalInDays, 'day');
  }

  return output;
};
