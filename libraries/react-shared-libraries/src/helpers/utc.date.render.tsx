'use client';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { FC } from 'react';
dayjs.extend(utc);
export const UtcToLocalDateRender: FC<{
  date: string;
  format: string;
}> = (props) => {
  const { date, format } = props;
  return <>{dayjs.utc(date).local().format(format)}</>;
};
