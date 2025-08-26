import { FC } from 'react';
import dayjs from 'dayjs';

export const RenderPreviewDate: FC<{ date: string }> = ({ date }) => {
  return <>{dayjs.utc(date).local().format('MMMM D, YYYY h:mm A')}</>;
};
