'use client';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useCallback } from 'react';

import { ReactComponent as ArrowLeftSvg } from '@gitroom/frontend/assets/arrow-left.svg';
import { ReactComponent as ArrowRightSvg } from '@gitroom/frontend/assets/arrow-right.svg';

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
      <div onClick={previous} className="cursor-pointer">
        <ArrowLeftSvg />
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
      <div onClick={next} className="cursor-pointer">
        <ArrowRightSvg />
      </div>
      <div className="flex-1">{betweenDates}</div>
      <div
        className={clsx(
          'border border-tableBorder p-[10px] cursor-pointer',
          week.display === 'day' && 'bg-tableBorder'
        )}
        onClick={setDay}
      >
        Day
      </div>
      <div
        className={clsx(
          'border border-tableBorder p-[10px] cursor-pointer',
          week.display === 'week' && 'bg-tableBorder'
        )}
        onClick={setWeek}
      >
        Week
      </div>
      <div
        className={clsx(
          'border border-tableBorder p-[10px] cursor-pointer',
          week.display === 'month' && 'bg-tableBorder'
        )}
        onClick={setMonth}
      >
        Month
      </div>
    </div>
  );
};
