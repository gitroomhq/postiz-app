'use client';
import dayjs, { ConfigType, Dayjs, PluginFunc } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
// the plugin below wraps methods of these, so they are registered first
dayjs.extend(utc);
dayjs.extend(relativeTime);

const MINUTE = 60000;
const HOUR = 3600000;
const DAY = 86400000;
const STORAGE_KEY = 'timezoneName';

const formatters = new Map<string, Intl.DateTimeFormat>();
const formatter = (timezone: string) => {
  let format = formatters.get(timezone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timezone, format);
  }
  return format;
};

// the offset (in minutes) of a timezone at an instant
const exactOffset = (timezone: string, timestamp: number) => {
  const time = Math.floor(timestamp / 1000) * 1000;
  const parts: Record<string, number> = {};
  for (const { type, value } of formatter(timezone).formatToParts(time)) {
    parts[type] = +value;
  }
  const wall = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour % 24,
    parts.minute,
    parts.second
  );
  return Math.round((wall - time) / MINUTE);
};

// offsets only change at transitions (about twice a year), so they are cached
// per UTC day; a day with a transition is cached per hour, and an hour with
// one is computed every time
const days = new Map<string, Map<number, number | null>>();
const hours = new Map<string, Map<number, number | null>>();
const cachedOffset = (
  cache: Map<string, Map<number, number | null>>,
  timezone: string,
  timestamp: number,
  size: number
) => {
  let offsets = cache.get(timezone);
  if (!offsets) {
    offsets = new Map();
    cache.set(timezone, offsets);
  }
  const bucket = Math.floor(timestamp / size);
  let offset = offsets.get(bucket);
  if (offset === undefined) {
    const start = exactOffset(timezone, bucket * size);
    offset =
      start === exactOffset(timezone, bucket * size + size - 1000)
        ? start
        : null;
    offsets.set(bucket, offset);
  }
  return offset;
};

const offsetAt = (timezone: string, timestamp: number) => {
  const day = cachedOffset(days, timezone, timestamp, DAY);
  if (day !== null) {
    return day;
  }
  const hour = cachedOffset(hours, timezone, timestamp, HOUR);
  return hour !== null ? hour : exactOffset(timezone, timestamp);
};

// a wall clock (as UTC milliseconds) to an instant, with the rules of
// new Date(y, m, d, ...): a skipped time moves forward, a repeated one takes
// the earlier instant
const wallToInstant = (timezone: string, wall: number) => {
  const before = offsetAt(timezone, wall - DAY);
  const after = offsetAt(timezone, wall + DAY);
  const first = wall - before * MINUTE;
  if (before === after) {
    return first;
  }
  const second = wall - after * MINUTE;
  const firstValid = offsetAt(timezone, first) === before;
  const secondValid = offsetAt(timezone, second) === after;
  if (firstValid && secondValid) {
    return Math.min(first, second);
  }
  return secondValid ? second : first;
};

const zoned = (instant: number, timezone: string, locale?: string): Dayjs =>
  dayjs(isNaN(instant) ? NaN : instant + offsetAt(timezone, instant) * MINUTE, {
    locale,
    utc: true,
    x: { $zone: timezone },
    $I: instant,
  } as any);

const STEPS: Record<string, number> = {
  minute: MINUTE,
  hour: HOUR,
  second: 1000,
};

// Dates from newDayjs() and fromUtc() carry the user's timezone ($x.$zone).
// They keep its wall clock in dayjs' UTC mode, so startOf, add and set work on
// it without DST, and keep the real instant ($I) for valueOf, utc() and diff.
// Every other dayjs date (plain dayjs(), Mantine) is left as it is.
// dayjs/plugin/timezone isn't used: every .tz() runs toLocaleString (~40µs,
// which made the calendar slow) and keeps a fixed offset that drifts on DST.
// This relies on dayjs internals ($d, $x, parse, init, clone), which is why
// dayjs is pinned to an exact version in package.json.
const zonedPlugin: PluginFunc = (option, dayjsClass) => {
  const proto = dayjsClass.prototype as any;
  const zoneOf = (date: any): string | undefined =>
    date?.$x && date.$offset === undefined ? date.$x.$zone : undefined;

  const oldParse = proto.parse;
  proto.parse = function (this: any, cfg: any) {
    if (cfg.x?.$zone) {
      this.$x = cfg.x;
      cfg.utc = true;
      this.$K = cfg.$I;
    }
    oldParse.call(this, cfg);
  };

  const oldInit = proto.init;
  proto.init = function (this: any) {
    const timezone = zoneOf(this);
    if (timezone && this.$K !== undefined) {
      // built from an instant: keep it, even inside a repeated hour
      this.$I = this.$K;
      this.$K = undefined;
    } else if (timezone && isNaN(this.$d.getTime())) {
      this.$I = NaN;
    } else if (timezone) {
      // built from a wall clock: a skipped time moves forward, like a local date
      const wall = this.$d.getTime();
      this.$I = wallToInstant(timezone, wall);
      const normalized = this.$I + offsetAt(timezone, this.$I) * MINUTE;
      if (normalized !== wall) {
        this.$d = new Date(normalized);
      }
    }
    oldInit.call(this);
  };

  const oldClone = proto.clone;
  proto.clone = function (this: any) {
    return zoneOf(this)
      ? dayjs(this.$d, {
          locale: this.$L,
          utc: true,
          x: this.$x,
          $I: this.$I,
        } as any)
      : oldClone.call(this);
  };

  const oldValueOf = proto.valueOf;
  proto.valueOf = function (this: any) {
    return zoneOf(this) ? this.$I : oldValueOf.call(this);
  };

  const oldToDate = proto.toDate;
  proto.toDate = function (this: any, type?: string) {
    if (zoneOf(this)) {
      return new Date(type === 's' ? this.$d.getTime() : this.$I);
    }
    return oldToDate.call(this, type);
  };

  const oldUtcOffset = proto.utcOffset;
  proto.utcOffset = function (this: any, input?: any, keepLocalTime?: any) {
    if (zoneOf(this)) {
      if (input === undefined) {
        return Math.round((this.$d.getTime() - this.$I) / MINUTE);
      }
      return dayjs(this.$I).utcOffset(input, keepLocalTime);
    }
    return oldUtcOffset.call(this, input, keepLocalTime);
  };

  const oldAdd = proto.add;
  proto.add = function (this: any, number: number, units?: any) {
    const timezone = zoneOf(this);
    const unit = timezone && this.$utils().p(units);
    if (!timezone || ['month', 'year', 'day', 'week'].includes(unit)) {
      return oldAdd.call(this, number, units);
    }
    // hours and below are elapsed time, not the wall clock
    return zoned(
      this.$I + Number(number) * (STEPS[unit] || 1),
      timezone,
      this.$L
    );
  };

  const oldLocal = proto.local;
  proto.local = function (this: any) {
    return zoneOf(this) ? this.clone() : oldLocal.call(this);
  };

  const oldIsUTC = proto.isUTC;
  proto.isUTC = function (this: any) {
    return zoneOf(this) ? false : oldIsUTC.call(this);
  };

  const oldFormat = proto.format;
  proto.format = function (this: any, formatStr?: string) {
    return oldFormat.call(
      this,
      !formatStr && zoneOf(this) ? 'YYYY-MM-DDTHH:mm:ssZ' : formatStr
    );
  };

  // relativeTime compares UTC mode dates with a UTC "now"
  const oldFromNow = proto.fromNow;
  proto.fromNow = function (this: any, withoutSuffix?: boolean) {
    const timezone = zoneOf(this);
    return timezone
      ? this.from(zoned(Date.now(), timezone, this.$L), withoutSuffix)
      : oldFromNow.call(this, withoutSuffix);
  };
  const oldToNow = proto.toNow;
  proto.toNow = function (this: any, withoutSuffix?: boolean) {
    const timezone = zoneOf(this);
    return timezone
      ? this.to(zoned(Date.now(), timezone, this.$L), withoutSuffix)
      : oldToNow.call(this, withoutSuffix);
  };

  // a machine-local date (or another timezone) is compared in this timezone,
  // UTC dates are already offset-compensated by dayjs' own diff
  const oldDiff = proto.diff;
  proto.diff = function (this: any, input: any, units?: any, float?: boolean) {
    const timezone = zoneOf(this);
    const that: any = timezone ? dayjs(input) : undefined;
    if (timezone && (zoneOf(that) ? zoneOf(that) !== timezone : !that.$u)) {
      return oldDiff.call(
        this,
        zoned(that.valueOf(), timezone, this.$L),
        units,
        float
      );
    }
    return oldDiff.call(this, input, units, float);
  };
};
dayjs.extend(zonedPlugin);

export const browserTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

export const isTimezone = (timezone: string) => {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch (err) {
    return false;
  }
};

// null is the browser's timezone, where plain dayjs is already right
let userTimezone: string | null = null;
const applyTimezone = (timezone?: string | null) => {
  userTimezone =
    timezone && timezone !== browserTimezone() && isTimezone(timezone)
      ? timezone
      : null;
};

// the timezone dates are shown in, for Intl formatting outside of dayjs
export const getTimezone = () => userTimezone || browserTimezone();

// pages outside the logged-in layout (connecting a channel, the extension)
// don't load the user, they start from the timezone the app loaded last
if (typeof window !== 'undefined') {
  try {
    applyTimezone(localStorage.getItem(STORAGE_KEY));
  } catch (err) {}
}

export const setUserTimezone = (timezone?: string | null) => {
  applyTimezone(timezone);
  try {
    if (timezone) {
      localStorage.setItem(STORAGE_KEY, timezone);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {}
};

// dayjs' local string format, anything else (Z, offsets, Dates) is an instant
const LOCAL_STRING =
  /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/;

// "now", a wall clock or an instant, in the user's timezone
export const newDayjs = (config?: ConfigType) => {
  if (!userTimezone) {
    return dayjs(config);
  }
  if (
    typeof config === 'string' &&
    !/Z$/i.test(config) &&
    LOCAL_STRING.test(config)
  ) {
    return dayjs(config, { utc: true, x: { $zone: userTimezone } } as any);
  }
  return zoned(
    config === undefined ? Date.now() : dayjs(config).valueOf(),
    userTimezone
  );
};

// a UTC date (an API string with or without the Z, or a UTC dayjs) in the
// user's timezone
export const fromUtc = (config?: ConfigType) =>
  userTimezone
    ? zoned(dayjs.utc(config).valueOf(), userTimezone)
    : dayjs.utc(config).local();

// Mantine's pickers only take native dates in the machine's timezone, so they
// get the wall clock as one
export const toPickerDate = (date: Dayjs) =>
  new Date(
    date.year(),
    date.month(),
    date.date(),
    date.hour(),
    date.minute(),
    date.second()
  );
