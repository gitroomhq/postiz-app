'use client';

import { FC } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { fromUtc } from '@gitroom/frontend/components/layout/set.timezone';
dayjs.extend(utc);

export const RenderPreviewDate: FC<{ date: string }> = ({ date }) => {
  console.log(date);
  return <>{fromUtc(date).format('MMMM D, YYYY h:mm A')}</>;
};
