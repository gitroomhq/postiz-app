'use client';

import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useCallback } from 'react';
import { SelectCustomer } from '@gitroom/frontend/components/launches/select.customer';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import i18next from 'i18next';

export const Filters = () => {
  const week = useCalendar();
  const t = useT();

  // Set dayjs locale based on current language
  const currentLanguage = i18next.resolvedLanguage || 'en';
  dayjs.locale(currentLanguage);

  const betweenDates =
    week.display === 'day'
      ? dayjs()
          .year(week.currentYear)
          .isoWeek(week.currentWeek)
          .day(week.currentDay)
          .format('L')
      : week.display === 'week'
      ? dayjs()
          .year(week.currentYear)
          .isoWeek(week.currentWeek)
          .startOf('isoWeek')
          .format('L') +
        ' - ' +
        dayjs()
          .year(week.currentYear)
          .isoWeek(week.currentWeek)
          .endOf('isoWeek')
          .format('L')
      : dayjs()
          .year(week.currentYear)
          .month(week.currentMonth)
          .startOf('month')
          .format('L') +
        ' - ' +
        dayjs()
          .year(week.currentYear)
          .month(week.currentMonth)
          .endOf('month')
          .format('L');
  const setDay = useCallback(() => {
    if (
      week.display === 'day' &&
      week.currentDay === +dayjs().day() &&
      week.currentWeek === dayjs().isoWeek() &&
      week.currentYear === dayjs().year() &&
      week.currentMonth === dayjs().month()
    ) {
      return; // No need to set the same day
    }

    week.setFilters({
      currentDay: +dayjs().day() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      currentWeek: dayjs().isoWeek(),
      currentYear: dayjs().year(),
      currentMonth: dayjs().month(),
      display: 'day',
      customer: week.customer,
    });
  }, [week]);
  const setWeek = useCallback(() => {
    if (
      week.display === 'week' &&
      week.currentWeek === dayjs().isoWeek() &&
      week.currentYear === dayjs().year() &&
      week.currentMonth === dayjs().month()
    ) {
      return; // No need to set the same week
    }
    week.setFilters({
      currentDay: +dayjs().day() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      currentWeek: dayjs().isoWeek(),
      currentYear: dayjs().year(),
      currentMonth: dayjs().month(),
      display: 'week',
      customer: week.customer,
    });
  }, [week]);
  const setMonth = useCallback(() => {
    if (
      week.display === 'month' &&
      week.currentMonth === dayjs().month() &&
      week.currentYear === dayjs().year()
    ) {
      return; // No need to set the same month
    }
    week.setFilters({
      currentDay: +dayjs().day() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      currentMonth: dayjs().month(),
      currentWeek: dayjs().isoWeek(),
      currentYear: dayjs().year(),
      display: 'month',
      customer: week.customer,
    });
  }, [week]);
  const setCustomer = useCallback(
    (customer: string) => {
      if (week.customer === customer) {
        return; // No need to set the same customer
      }
      week.setFilters({
        currentDay: week.currentDay,
        currentMonth: week.currentMonth,
        currentWeek: week.currentWeek,
        currentYear: week.currentYear,
        display: week.display as any,
        customer: customer,
      });
    },
    [week]
  );
  const next = useCallback(() => {
    const increaseDay = week.display === 'day';
    const increaseWeek =
      week.display === 'week' ||
      (week.display === 'day' && week.currentDay === 6);
    const increaseMonth =
      week.display === 'month' || (increaseWeek && week.currentWeek === 52);
    week.setFilters({
      customer: week.customer,
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
      customer: week.customer,
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

  const setCurrent = useCallback(
    (type: 'day' | 'week' | 'month') => () => {
      if (type === 'day') {
        setDay();
      } else if (type === 'week') {
        setWeek();
      } else if (type === 'month') {
        setMonth();
      }
    },
    [
      week.display,
      week.currentMonth,
      week.currentWeek,
      week.currentYear,
      week.currentDay,
    ]
  );
  return (
    <div className="text-textColor flex flex-col md:flex-row gap-[8px] items-center select-none">
      <div className="flex flex-grow flex-row items-center gap-[20px]">
        <div className="border h-[42px] border-newTableBorder bg-newTableBorder gap-[1px] flex items-center rounded-[8px] overflow-hidden">
          <div
            onClick={previous}
            className="cursor-pointer text-textColor rtl:rotate-180 px-[9px] bg-newBgColorInner h-full flex items-center justify-center hover:text-textItemFocused hover:bg-boxFocused"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="8"
              height="12"
              viewBox="0 0 8 12"
              fill="none"
            >
              <path
                d="M6.5 11L1.5 6L6.5 1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="w-[80px] text-center bg-newBgColorInner h-full flex items-center justify-center hover:text-textItemFocused hover:bg-boxFocused">
            <div
              onClick={setCurrent(week.display as 'day' | 'week' | 'month')}
              className="py-[3px] rounded-[5px] transition-all cursor-pointer text-[14px]"
            >
              Today
            </div>
          </div>
          <div
            onClick={next}
            className="cursor-pointer text-textColor rtl:rotate-180 px-[9px] bg-newBgColorInner h-full flex items-center justify-center hover:text-textItemFocused hover:bg-boxFocused"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="8"
              height="12"
              viewBox="0 0 8 12"
              fill="none"
            >
              <path
                d="M1.5 11L6.5 6L1.5 1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <div className="flex-1 text-[14px] font-[500]">
          {week.display === 'day'
            ? `${dayjs()
                .month(week.currentMonth)
                .week(week.currentWeek)
                .day(week.currentDay)
                .format('dddd (L)')}`
            : week.display === 'week'
            ? betweenDates
            : dayjs().month(week.currentMonth).format('MMMM YYYY')}
        </div>
      </div>
      <SelectCustomer
        customer={week.customer as string}
        onChange={(customer: string) => setCustomer(customer)}
        integrations={week.integrations}
      />
      <div className="flex flex-row p-[4px] border border-newTableBorder rounded-[8px] text-[14px] font-[500]">
        <div
          className={clsx(
            'pt-[6px] pb-[5px] cursor-pointer w-[74px] text-center rounded-[6px]',
            week.display === 'day' && 'text-textItemFocused bg-boxFocused'
          )}
          onClick={setDay}
        >
          {t('day', 'Day')}
        </div>
        <div
          className={clsx(
            'pt-[6px] pb-[5px] cursor-pointer w-[74px] text-center rounded-[6px]',
            week.display === 'week' && 'text-textItemFocused bg-boxFocused'
          )}
          onClick={setWeek}
        >
          {t('week', 'Week')}
        </div>
        <div
          className={clsx(
            'pt-[6px] pb-[5px] cursor-pointer w-[74px] text-center rounded-[6px]',
            week.display === 'month' && 'text-textItemFocused bg-boxFocused'
          )}
          onClick={setMonth}
        >
          {t('month', 'Month')}
        </div>
      </div>
    </div>
  );
};
