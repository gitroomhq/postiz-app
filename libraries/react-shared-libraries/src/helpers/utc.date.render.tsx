'use client';

import { FC } from 'react';
import { fromUtc } from '@gitroom/frontend/components/layout/set.timezone';
export const UtcToLocalDateRender: FC<{
  date: string;
  format: string;
}> = (props) => {
  const { date, format } = props;
  return <>{fromUtc(date).format(format)}</>;
};
