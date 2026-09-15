import dayjs from 'dayjs';

/** Round up to the next quarter hour (already-aligned times stay). */
export function roundUpToQuarterHourUtc(now: dayjs.Dayjs): dayjs.Dayjs {
  const extra = now.minute() % 15;
  const aligned =
    extra === 0 && now.second() === 0 && now.millisecond() === 0;
  let next = now.second(0).millisecond(0);
  if (!aligned) {
    next = next.add(15 - extra, 'minute');
  }
  return next;
}

export function soonWindow(now: dayjs.Dayjs): {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
} {
  return {
    start: roundUpToQuarterHourUtc(now.add(1, 'hour')),
    end: now.add(4, 'hour'),
  };
}

/**
 * Quarter-hour offsets from `day`'s midnight that fall in [from, to].
 */
export function quarterHourMinutesOnDay(
  day: dayjs.Dayjs,
  from: dayjs.Dayjs,
  to: dayjs.Dayjs
): number[] {
  const dayStart = day.startOf('day');
  const times: number[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
    const slot = dayStart.add(minutes, 'minute');
    if (slot.isBefore(from) || slot.isAfter(to)) {
      continue;
    }
    times.push(minutes);
  }
  return times;
}

export function daysSpanning(from: dayjs.Dayjs, to: dayjs.Dayjs): dayjs.Dayjs[] {
  const days: dayjs.Dayjs[] = [];
  let cursor = from.startOf('day');
  const last = to.startOf('day');
  while (!cursor.isAfter(last)) {
    days.push(cursor);
    cursor = cursor.add(1, 'day');
  }
  return days;
}
