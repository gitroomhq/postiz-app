import {
  getNextRecurringOccurrenceDate,
  listRecurringOccurrencesInRange,
} from '@gitroom/helpers/utils/recurrence';

describe('recurrence utils', () => {
  it('keeps local wall clock time across DST spring-forward', () => {
    const next = getNextRecurringOccurrenceDate({
      anchorDate: '2026-03-07T14:30:00.000Z',
      intervalInDays: 1,
      timezone: 'America/New_York',
      fromDate: '2026-03-08T14:00:00.000Z',
    });

    expect(next.toISOString()).toBe('2026-03-09T13:30:00.000Z');
  });

  it('keeps local wall clock time across DST fall-back', () => {
    const next = getNextRecurringOccurrenceDate({
      anchorDate: '2026-10-31T13:30:00.000Z',
      intervalInDays: 1,
      timezone: 'America/New_York',
      fromDate: '2026-11-01T15:00:00.000Z',
    });

    expect(next.toISOString()).toBe('2026-11-02T14:30:00.000Z');
  });

  it('falls back to legacy fixed-day behavior when timezone is missing', () => {
    const next = getNextRecurringOccurrenceDate({
      anchorDate: '2026-03-07T14:30:00.000Z',
      intervalInDays: 1,
      fromDate: '2026-03-08T14:00:00.000Z',
    });

    expect(next.toISOString()).toBe('2026-03-08T14:30:00.000Z');
  });

  it('expands occurrences in range using timezone-aware recurrence', () => {
    const dates = listRecurringOccurrencesInRange({
      anchorDate: '2026-03-07T14:30:00.000Z',
      intervalInDays: 1,
      timezone: 'America/New_York',
      rangeStart: '2026-03-07T00:00:00.000Z',
      rangeEnd: '2026-03-09T23:59:59.000Z',
    });

    expect(dates.map((d) => d.toISOString())).toEqual([
      '2026-03-07T14:30:00.000Z',
      '2026-03-08T13:30:00.000Z',
      '2026-03-09T13:30:00.000Z',
    ]);
  });
});
