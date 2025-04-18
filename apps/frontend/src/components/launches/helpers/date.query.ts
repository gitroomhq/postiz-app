import dayjs from 'dayjs';
import { ReadonlyURLSearchParams } from 'next/navigation';
import { DateRange } from './date.range.picker';
import customParseFormat from 'dayjs/plugin/customParseFormat';

const DATE_QUERY_FORMAT = 'YYYY-MM-DD';

export const getDateRangeQuery = (searchParams: ReadonlyURLSearchParams) => {
  const startDateParams = searchParams.get('startDate');
  const endDateParams = searchParams.get('endDate');
  dayjs.extend(customParseFormat);
  const dateRange: DateRange = {
    startDate: startDateParams
      ? dayjs(startDateParams, DATE_QUERY_FORMAT)
      : undefined,
    endDate: endDateParams
      ? dayjs(endDateParams, DATE_QUERY_FORMAT)
      : undefined,
  };
  return dateRange;
};
export const getDateRangeUrl = (
  searchParams: ReadonlyURLSearchParams,
  dateRange: DateRange
) => {
  const params = new URLSearchParams(searchParams);
  if (dateRange.startDate) {
    params.set('startDate', dateRange.startDate.format(DATE_QUERY_FORMAT));
  } else {
    params.delete('startDate');
  }

  if (dateRange.endDate) {
    params.set('endDate', dateRange.endDate.format(DATE_QUERY_FORMAT));
  } else {
    params.delete('endDate');
  }
  return params.toString();
};
