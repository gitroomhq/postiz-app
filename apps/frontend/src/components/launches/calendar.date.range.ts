import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

export type WeekStart = 'monday' | 'today';

export function getDateRange(
  display: string,
  date: Dayjs,
  weekStart: WeekStart = 'monday'
) {
  switch (display) {
    case 'day':
    case 'list':
      return {
        startDate: date.format('YYYY-MM-DD'),
        endDate: date.format('YYYY-MM-DD'),
      };
    case 'month':
      return {
        startDate: date.startOf('month').format('YYYY-MM-DD'),
        endDate: date.endOf('month').format('YYYY-MM-DD'),
      };
    default: {
      const start = weekStart === 'today' ? date : date.startOf('isoWeek');
      return {
        startDate: start.format('YYYY-MM-DD'),
        endDate: start.add(6, 'day').format('YYYY-MM-DD'),
      };
    }
  }
}
