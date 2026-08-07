import { use12HourClock } from '@gitroom/frontend/components/launches/helpers/date.format';

/**
 * Time-only preference (AM/PM vs 24h) from `localStorage.isUS`.
 * Does **not** control date order (MM/DD vs DD/MM) — use `getDateOrder` /
 * `useDateFormat` from `date.format.tsx` for that.
 *
 * Prefer `use12HourClock()` / `useDateFormat().use12Hour` at new call sites.
 */
export const isUSCitizen = () => use12HourClock();
