'use client';

import { FC } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useDateFormat } from '@gitroom/frontend/components/launches/helpers/date.format';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

dayjs.extend(utc);

export const RenderPreviewDate: FC<{ date: string }> = ({ date }) => {
  const { longDateTimePattern } = useDateFormat();
  const t = useT();
  const parsed = dayjs.utc(date);
  if (!date || !parsed.isValid()) {
    return <>{t('not_scheduled', 'Not scheduled')}</>;
  }
  return <>{parsed.local().format(longDateTimePattern())}</>;
};
