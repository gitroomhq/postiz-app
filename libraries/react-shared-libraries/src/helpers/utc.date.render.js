'use client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
export const UtcToLocalDateRender = (props) => {
    const { date, format } = props;
    return <>{dayjs.utc(date).local().format(format)}</>;
};
//# sourceMappingURL=utc.date.render.js.map