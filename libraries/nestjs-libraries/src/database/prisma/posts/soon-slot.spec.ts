import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import {
  daysSpanning,
  quarterHourMinutesOnDay,
  roundUpToQuarterHourUtc,
  soonWindow,
} from './soon-slot.ts';

dayjs.extend(utc);

describe('soon slot (Create Post default)', () => {
  it('keeps an already-aligned quarter hour', () => {
    const now = dayjs.utc('2026-09-15T14:00:00.000Z');
    assert.equal(
      roundUpToQuarterHourUtc(now).toISOString(),
      '2026-09-15T14:00:00.000Z'
    );
  });

  it('rounds 14:07 up to 14:15', () => {
    const now = dayjs.utc('2026-09-15T14:07:22.400Z');
    assert.equal(
      roundUpToQuarterHourUtc(now).toISOString(),
      '2026-09-15T14:15:00.000Z'
    );
  });

  it('opens 1–4 hours from now, never next-day 02:00 postingTimes', () => {
    const now = dayjs.utc('2026-09-15T14:07:00.000Z');
    const { start, end } = soonWindow(now);
    assert.equal(start.toISOString(), '2026-09-15T15:15:00.000Z');
    assert.equal(end.toISOString(), '2026-09-15T18:07:00.000Z');
    const times = quarterHourMinutesOnDay(start, start, end);
    assert.ok(times.includes(15 * 60 + 15));
    assert.equal(times.includes(120), false);
  });

  it('crosses midnight when now is late evening', () => {
    const now = dayjs.utc('2026-09-15T23:10:00.000Z');
    const { start, end } = soonWindow(now);
    assert.equal(start.toISOString(), '2026-09-16T00:15:00.000Z');
    assert.equal(end.toISOString(), '2026-09-16T03:10:00.000Z');
    const days = daysSpanning(start, end);
    assert.equal(days.length, 1);
    assert.equal(days[0].format('YYYY-MM-DD'), '2026-09-16');
  });
});
