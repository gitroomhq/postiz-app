'use client';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useCallback } from 'react';

export const Filters = () => {
  const week = useCalendar();
  const betweenDates =
    week.display === 'day'
      ? dayjs()
          .year(week.currentYear)
          .isoWeek(week.currentWeek)
          .day(week.currentDay)
          .format('DD/MM/YYYY')
      : week.display === 'week'
      ? dayjs()
          .year(week.currentYear)
          .isoWeek(week.currentWeek)
          .startOf('isoWeek')
          .format('DD/MM/YYYY') +
        ' - ' +
        dayjs()
          .year(week.currentYear)
          .isoWeek(week.currentWeek)
          .endOf('isoWeek')
          .format('DD/MM/YYYY')
      : dayjs()
          .year(week.currentYear)
          .month(week.currentMonth)
          .startOf('month')
          .format('DD/MM/YYYY') +
        ' - ' +
        dayjs()
          .year(week.currentYear)
          .month(week.currentMonth)
          .endOf('month')
          .format('DD/MM/YYYY');

  const setDay = useCallback(() => {
    week.setFilters({
      currentDay: +dayjs().day() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      currentWeek: dayjs().isoWeek(),
      currentYear: dayjs().year(),
      currentMonth: dayjs().month(),
      display: 'day',
    });
  }, [week]);

  const setWeek = useCallback(() => {
    week.setFilters({
      currentDay: +dayjs().day() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      currentWeek: dayjs().isoWeek(),
      currentYear: dayjs().year(),
      currentMonth: dayjs().month(),
      display: 'week',
    });
  }, [week]);

  const setMonth = useCallback(() => {
    week.setFilters({
      currentDay: +dayjs().day() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      currentMonth: dayjs().month(),
      currentWeek: dayjs().isoWeek(),
      currentYear: dayjs().year(),
      display: 'month',
    });
  }, [week]);

  const next = useCallback(() => {
    const increaseDay = week.display === 'day';
    const increaseWeek =
      week.display === 'week' ||
      (week.display === 'day' && week.currentDay === 6);
    const increaseMonth =
      week.display === 'month' || (increaseWeek && week.currentWeek === 52);

    week.setFilters({
      currentDay: (!increaseDay
        ? 0
        : week.currentDay === 6
        ? 0
        : week.currentDay + 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      currentWeek: !increaseWeek
        ? week.currentWeek
        : week.currentWeek === 52
        ? 1
        : week.currentWeek + 1,
      currentYear: !increaseMonth
        ? week.currentYear
        : week.currentMonth === 11
        ? week.currentYear + 1
        : week.currentYear,
      display: week.display as any,
      currentMonth: !increaseMonth
        ? week.currentMonth
        : week.currentMonth === 11
        ? 0
        : week.currentMonth + 1,
    });
  }, [
    week.display,
    week.currentMonth,
    week.currentWeek,
    week.currentYear,
    week.currentDay,
  ]);

  const previous = useCallback(() => {
    const decreaseDay = week.display === 'day';
    const decreaseWeek =
      week.display === 'week' ||
      (week.display === 'day' && week.currentDay === 0);
    const decreaseMonth =
      week.display === 'month' || (decreaseWeek && week.currentWeek === 1);

    week.setFilters({
      currentDay: (!decreaseDay
        ? 0
        : week.currentDay === 0
        ? 6
        : week.currentDay - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      currentWeek: !decreaseWeek
        ? week.currentWeek
        : week.currentWeek === 1
        ? 52
        : week.currentWeek - 1,
      currentYear: !decreaseMonth
        ? week.currentYear
        : week.currentMonth === 0
        ? week.currentYear - 1
        : week.currentYear,
      display: week.display as any,
      currentMonth: !decreaseMonth
        ? week.currentMonth
        : week.currentMonth === 0
        ? 11
        : week.currentMonth - 1,
    });
  }, [
    week.display,
    week.currentMonth,
    week.currentWeek,
    week.currentYear,
    week.currentDay,
  ]);
  return (
    <div className="text-textColor flex gap-[8px] items-center select-none">
      <div onClick={previous}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M13.1644 15.5866C13.3405 15.7628 13.4395 16.0016 13.4395 16.2507C13.4395 16.4998 13.3405 16.7387 13.1644 16.9148C12.9883 17.0909 12.7494 17.1898 12.5003 17.1898C12.2513 17.1898 12.0124 17.0909 11.8363 16.9148L5.58629 10.6648C5.49889 10.5777 5.42954 10.4742 5.38222 10.3602C5.3349 10.2463 5.31055 10.1241 5.31055 10.0007C5.31055 9.87732 5.3349 9.75515 5.38222 9.64119C5.42954 9.52724 5.49889 9.42375 5.58629 9.33665L11.8363 3.08665C12.0124 2.91053 12.2513 2.81158 12.5003 2.81158C12.7494 2.81158 12.9883 2.91053 13.1644 3.08665C13.3405 3.26277 13.4395 3.50164 13.4395 3.75071C13.4395 3.99978 13.3405 4.23865 13.1644 4.41477L7.57925 9.99993L13.1644 15.5866Z"
            fill="#E9E9F1"
          />
        </svg>
      </div>
      <div className="w-[80px] text-center">
        {week.display === 'day'
          ? `${dayjs()
              .month(week.currentMonth)
              .week(week.currentWeek)
              .day(week.currentDay)
              .format('dddd')}`
          : week.display === 'week'
          ? `Week ${week.currentWeek}`
          : `${dayjs().month(week.currentMonth).format('MMMM')}`}
      </div>
      <div onClick={next}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M14.4137 10.6633L8.16374 16.9133C7.98761 17.0894 7.74874 17.1884 7.49967 17.1884C7.2506 17.1884 7.01173 17.0894 6.83561 16.9133C6.65949 16.7372 6.56055 16.4983 6.56055 16.2492C6.56055 16.0002 6.65949 15.7613 6.83561 15.5852L12.4223 10L6.83717 4.41331C6.74997 4.3261 6.68079 4.22257 6.6336 4.10863C6.5864 3.99469 6.56211 3.87257 6.56211 3.74925C6.56211 3.62592 6.5864 3.5038 6.6336 3.38986C6.68079 3.27592 6.74997 3.17239 6.83717 3.08518C6.92438 2.99798 7.02791 2.9288 7.14185 2.88161C7.25579 2.83441 7.37791 2.81012 7.50124 2.81012C7.62456 2.81012 7.74668 2.83441 7.86062 2.88161C7.97456 2.9288 8.07809 2.99798 8.1653 3.08518L14.4153 9.33518C14.5026 9.42238 14.5718 9.52596 14.619 9.63997C14.6662 9.75398 14.6904 9.87618 14.6903 9.99957C14.6901 10.123 14.6656 10.2451 14.6182 10.359C14.5707 10.4729 14.5012 10.5763 14.4137 10.6633Z"
            fill="#E9E9F1"
          />
        </svg>
      </div>
      <div className="flex-1">{betweenDates}</div>
      <div
        className={clsx(
          'border border-tableBorder p-[10px]',
          week.display === 'day' && 'bg-tableBorder'
        )}
        onClick={setDay}
      >
        Day
      </div>
      <div
        className={clsx(
          'border border-tableBorder p-[10px]',
          week.display === 'week' && 'bg-tableBorder'
        )}
        onClick={setWeek}
      >
        Week
      </div>
      <div
        className={clsx(
          'border border-tableBorder p-[10px]',
          week.display === 'month' && 'bg-tableBorder'
        )}
        onClick={setMonth}
      >
        Month
      </div>
    </div>
  );
};
