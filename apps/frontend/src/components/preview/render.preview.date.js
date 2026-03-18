'use client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
export const RenderPreviewDate = ({ date }) => {
    console.log(date);
    return <>{dayjs.utc(date).local().format('MMMM D, YYYY h:mm A')}</>;
};
//# sourceMappingURL=render.preview.date.js.map