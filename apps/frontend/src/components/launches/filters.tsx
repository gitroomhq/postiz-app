'use client';

import {
  useCalendar,
  ListRangeFilter,
} from '@gitroom/frontend/components/launches/calendar.context';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SelectCustomer } from '@gitroom/frontend/components/launches/select.customer';
import { ChannelFilter } from '@gitroom/frontend/components/launches/channel.filter';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import i18next from 'i18next';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';

// Helper function to get start and end dates based on display type
function getDateRange(
  display: 'day' | 'week' | 'month' | 'list',
  referenceDate?: string
) {
  const date = referenceDate ? newDayjs(referenceDate) : newDayjs();

  switch (display) {
    case 'day':
      return {
        startDate: date.format('YYYY-MM-DD'),
        endDate: date.format('YYYY-MM-DD'),
      };
    case 'week':
      return {
        startDate: date.startOf('isoWeek').format('YYYY-MM-DD'),
        endDate: date.endOf('isoWeek').format('YYYY-MM-DD'),
      };
    case 'month':
      return {
        startDate: date.startOf('month').format('YYYY-MM-DD'),
        endDate: date.endOf('month').format('YYYY-MM-DD'),
      };
    case 'list':
      return {
        startDate: date.format('YYYY-MM-DD'),
        endDate: date.format('YYYY-MM-DD'),
      };
  }
}

export const Filters = () => {
  const calendar = useCalendar();
  const t = useT();

  // Set dayjs locale based on current language
  const currentLanguage = i18next.resolvedLanguage || 'en';
  dayjs.locale();

  // Calculate display date range text
  const getDisplayText = () => {
    const startDate = newDayjs(calendar.startDate);
    const endDate = newDayjs(calendar.endDate);

    switch (calendar.display) {
      case 'day':
        return startDate.format('dddd (L)');
      case 'week':
        return `${startDate.format('L')} - ${endDate.format('L')}`;
      case 'month':
        return startDate.format('MMMM YYYY');
      default:
        return '';
    }
  };

  const setToday = useCallback(() => {
    const today = newDayjs();
    const currentRange = getDateRange(
      calendar.display as 'day' | 'week' | 'month'
    );

    // Check if we're already showing today's range
    if (
      calendar.startDate === currentRange.startDate &&
      calendar.endDate === currentRange.endDate
    ) {
      return; // No need to set the same range
    }

    calendar.setFilters({
      startDate: currentRange.startDate,
      endDate: currentRange.endDate,
      display: calendar.display as 'day' | 'week' | 'month',
      customer: calendar.customer,
    });
  }, [calendar]);

  const setDay = useCallback(() => {
    // If already in day view and showing today, don't change
    if (calendar.display === 'day') {
      const todayRange = getDateRange('day');
      if (calendar.startDate === todayRange.startDate) {
        return;
      }
    }

    const range = getDateRange('day');
    calendar.setFilters({
      startDate: range.startDate,
      endDate: range.endDate,
      display: 'day',
      customer: calendar.customer,
    });
  }, [calendar]);

  const setWeek = useCallback(() => {
    // If already in week view and showing current week, don't change
    if (calendar.display === 'week') {
      const currentWeekRange = getDateRange('week');
      if (calendar.startDate === currentWeekRange.startDate) {
        return;
      }
    }

    const range = getDateRange('week');
    calendar.setFilters({
      startDate: range.startDate,
      endDate: range.endDate,
      display: 'week',
      customer: calendar.customer,
    });
  }, [calendar]);

  const setMonth = useCallback(() => {
    // If already in month view and showing current month, don't change
    if (calendar.display === 'month') {
      const currentMonthRange = getDateRange('month');
      if (calendar.startDate === currentMonthRange.startDate) {
        return;
      }
    }

    const range = getDateRange('month');
    calendar.setFilters({
      startDate: range.startDate,
      endDate: range.endDate,
      display: 'month',
      customer: calendar.customer,
    });
  }, [calendar]);

  const setList = useCallback(() => {
    if (calendar.display === 'list') {
      return;
    }

    const range = getDateRange('list');
    calendar.setFilters({
      startDate: range.startDate,
      endDate: range.endDate,
      display: 'list',
      customer: calendar.customer,
    });
  }, [calendar]);

  const setCalendarView = useCallback(() => {
    if (calendar.display !== 'list') {
      return;
    }

    const range = getDateRange('week');
    calendar.setFilters({
      startDate: range.startDate,
      endDate: range.endDate,
      display: 'week',
      customer: calendar.customer,
    });
  }, [calendar]);

  const setCustomer = useCallback(
    (customer: string) => {
      if (calendar.customer === customer) {
        return; // No need to set the same customer
      }
      calendar.setFilters({
        startDate: calendar.startDate,
        endDate: calendar.endDate,
        display: calendar.display as 'day' | 'week' | 'month',
        customer: customer,
      });
    },
    [calendar]
  );

  const next = useCallback(() => {
    const currentStart = newDayjs(calendar.startDate);
    let nextStart: dayjs.Dayjs;

    switch (calendar.display) {
      case 'day':
        nextStart = currentStart.add(1, 'day');
        break;
      case 'week':
        nextStart = currentStart.add(1, 'week');
        break;
      case 'month':
        nextStart = currentStart.add(1, 'month');
        break;
      default:
        nextStart = currentStart.add(1, 'week');
    }

    const range = getDateRange(
      calendar.display as 'day' | 'week' | 'month',
      nextStart.format('YYYY-MM-DD')
    );
    calendar.setFilters({
      startDate: range.startDate,
      endDate: range.endDate,
      display: calendar.display as 'day' | 'week' | 'month',
      customer: calendar.customer,
    });
  }, [calendar]);

  const previous = useCallback(() => {
    const currentStart = newDayjs(calendar.startDate);
    let prevStart: dayjs.Dayjs;

    switch (calendar.display) {
      case 'day':
        prevStart = currentStart.subtract(1, 'day');
        break;
      case 'week':
        prevStart = currentStart.subtract(1, 'week');
        break;
      case 'month':
        prevStart = currentStart.subtract(1, 'month');
        break;
      default:
        prevStart = currentStart.subtract(1, 'week');
    }

    const range = getDateRange(
      calendar.display as 'day' | 'week' | 'month',
      prevStart.format('YYYY-MM-DD')
    );
    calendar.setFilters({
      startDate: range.startDate,
      endDate: range.endDate,
      display: calendar.display as 'day' | 'week' | 'month',
      customer: calendar.customer,
    });
  }, [calendar]);

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
    [setDay, setWeek, setMonth]
  );

  const isListView = calendar.display === 'list';
  const [rangeOpen, setRangeOpen] = useState(false);
  const rangeRef = useRef<HTMLDivElement>(null);
  const { referenceRef: rangeTriggerRef, floatingRef: rangeMenuRef } =
    useAnchoredPopover<HTMLButtonElement, HTMLDivElement>(rangeOpen, 'start');

  useEffect(() => {
    if (!rangeOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!rangeRef.current?.contains(e.target as Node)) setRangeOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [rangeOpen]);

  const listRangeOptions = useMemo(() => {
    const opts: { value: ListRangeFilter; label: string }[] = [
      { value: 'all', label: t('all_dates', 'All dates') },
      { value: 'today', label: t('today', 'Today') },
      { value: 'week', label: t('this_week', 'This week') },
      { value: 'next3', label: t('next_3_days', 'Next 3 days') },
      { value: 'past', label: t('past_only', 'Past only') },
    ];
    if (calendar.listRange.startsWith('day:')) {
      const d = newDayjs(calendar.listRange.slice(4));
      opts.unshift({
        value: calendar.listRange,
        label: d.format(isUSCitizen() ? 'dddd, MMMM D' : 'dddd, D MMMM'),
      });
    }
    return opts;
  }, [calendar.listRange, t]);

  const listRangeLabel =
    listRangeOptions.find((o) => o.value === calendar.listRange)?.label ||
    t('all_dates', 'All dates');

  const toggleListSort = useCallback(() => {
    calendar.setListSort(calendar.listSort === 'asc' ? 'desc' : 'asc');
  }, [calendar]);

  // The design draws all three of this toolbar's switches the same way: a
  // `--settings` trough with a raised `--inner` pill on the chosen option.
  const segment = 'flex gap-[2px] rounded-pqSm bg-pqSettings p-[2px]';
  const segmentItem =
    'flex h-[28px] cursor-pointer items-center justify-center rounded-[6px] px-[10px] text-center text-[12.5px] transition-colors';
  const segmentOn = 'bg-pqInner font-[600] text-pqText shadow-pqE1';
  const segmentOff = 'font-[500] text-pqSoft hover:text-pqText';
  return (
    <div
      data-tour="cal-views"
      className="flex select-none flex-col items-center gap-[8px] text-pqText md:flex-row"
    >
      {!isListView && (
        <div className="flex flex-grow flex-row items-center gap-[10px]">
          <div className="flex h-[34px] items-center overflow-hidden rounded-pqSm bg-pqInner shadow-[inset_0_0_0_1px_var(--border)]">
            <div
              onClick={previous}
              className="flex h-full cursor-pointer items-center justify-center px-[10px] text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText rtl:rotate-180"
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
            <div className="flex h-full min-w-[190px] items-center justify-center text-center">
              {/* A date range is a left-to-right token: in RTL, bidi otherwise
                  flips "03/08 - 09/08" into "09/08 - 03/08" and the week reads
                  backwards. */}
              <div dir="ltr" className="px-[9px] text-[13px] font-[500]">
                {getDisplayText()}
              </div>
            </div>
            <div
              onClick={next}
              className="flex h-full cursor-pointer items-center justify-center px-[10px] text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText rtl:rotate-180"
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
            <div className="flex h-[34px] text-center">
              <div
                onClick={setToday}
                className="flex h-[34px] cursor-pointer items-center justify-center rounded-pqSm bg-pqInner px-[14px] text-[13px] font-[500] shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-pqHover hover:text-pqText"
              >
                {t('today', 'Today')}
              </div>
            </div>
          </div>
        </div>
      )}
      {isListView && (
        <div className="flex flex-grow flex-row items-center gap-[10px]">
          {/* Prototype list toolbar: date-range chip + Newest/Oldest — not the
              status segment (status lives on the queue panel, hidden on Posts). */}
          <div className="relative" ref={rangeRef}>
            <button
              type="button"
              ref={rangeTriggerRef}
              onClick={() => setRangeOpen((o) => !o)}
              className={clsx(
                'flex h-[32px] items-center gap-[7px] rounded-pqSm pe-[11px] ps-[10px] text-[12.5px] font-[500] text-pqText shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-pqHover',
                rangeOpen ? 'bg-pqHover' : 'bg-transparent'
              )}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
                <path
                  d="M7 3.5v3M17 3.5v3M4.5 9h15M6 5.5h12a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
              {listRangeLabel}
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                className={clsx(
                  'shrink-0 text-pqSoft transition-transform',
                  rangeOpen && 'rotate-180'
                )}
                aria-hidden="true"
              >
                <path
                  d="m6 9 6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {rangeOpen && (
              <div
                ref={rangeMenuRef}
                className="z-[20] w-[210px] rounded-pqMd bg-pqPop p-[5px] shadow-[var(--e3),inset_0_0_0_1px_var(--border)]"
              >
                {listRangeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      calendar.setListRange(opt.value);
                      setRangeOpen(false);
                    }}
                    className={clsx(
                      'flex h-[32px] w-full items-center rounded-pqSm px-[10px] text-start text-[13px] transition-colors',
                      calendar.listRange === opt.value
                        ? 'bg-[rgba(124,58,237,.15)] font-[600] text-pqFocused'
                        : 'font-[500] text-pqMuted hover:bg-pqHover hover:text-pqText'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleListSort}
            title={
              calendar.listSort === 'desc'
                ? t('sorted_newest_first', 'Sorted newest first')
                : t('sorted_oldest_first', 'Sorted oldest first')
            }
            className="flex h-[32px] shrink-0 items-center gap-[6px] rounded-pqSm pe-[11px] ps-[9px] text-[12.5px] font-[500] text-pqMuted shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-pqHover hover:text-pqText"
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              className={clsx(calendar.listSort === 'desc' && 'scale-y-[-1]')}
              aria-hidden="true"
            >
              <path
                d="M7 4.5v15M7 19.5l-3-3M7 19.5l3-3M13 6.5h7M13 11.5h5M13 16.5h3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {calendar.listSort === 'desc'
              ? t('newest', 'Newest')
              : t('oldest', 'Oldest')}
          </button>
          <div className="flex-1" />
        </div>
      )}
      <SelectCustomer
        customer={calendar.customer as string}
        onChange={(customer: string) => setCustomer(customer)}
        integrations={calendar.integrations}
      />
      <ChannelFilter />
      {!isListView && (
        <div className={segment}>
          <div
            className={clsx(
              segmentItem,
              'w-[60px]',
              calendar.display === 'day' ? segmentOn : segmentOff
            )}
            onClick={setDay}
          >
            {t('day', 'Day')}
          </div>
          <div
            className={clsx(
              segmentItem,
              'w-[60px]',
              calendar.display === 'week' ? segmentOn : segmentOff
            )}
            onClick={setWeek}
          >
            {t('week', 'Week')}
          </div>
          <div
            className={clsx(
              segmentItem,
              'w-[60px]',
              calendar.display === 'month' ? segmentOn : segmentOff
            )}
            onClick={setMonth}
          >
            {t('month', 'Month')}
          </div>
        </div>
      )}
      <div className={segment}>
        <div
          onClick={setCalendarView}
          className={clsx(
            segmentItem,
            'w-[30px] px-0',
            !isListView ? segmentOn : segmentOff
          )}
        >
          {/*calendar*/}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="19"
            viewBox="0 0 17 19"
            fill="none"
          >
            <path
              d="M15.75 7.41667H0.75M11.5833 0.75V4.08333M4.91667 0.75V4.08333M4.75 17.4167H11.75C13.1501 17.4167 13.8502 17.4167 14.385 17.1442C14.8554 16.9045 15.2378 16.522 15.4775 16.0516C15.75 15.5169 15.75 14.8168 15.75 13.4167V6.41667C15.75 5.01654 15.75 4.31647 15.4775 3.78169C15.2378 3.31129 14.8554 2.92883 14.385 2.68915C13.8502 2.41667 13.1501 2.41667 11.75 2.41667H4.75C3.34987 2.41667 2.6498 2.41667 2.11502 2.68915C1.64462 2.92883 1.26217 3.31129 1.02248 3.78169C0.75 4.31647 0.75 5.01654 0.75 6.41667V13.4167C0.75 14.8168 0.75 15.5169 1.02248 16.0516C1.26217 16.522 1.64462 16.9045 2.11502 17.1442C2.6498 17.4167 3.34987 17.4167 4.75 17.4167Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div
          onClick={setList}
          className={clsx(
            segmentItem,
            'w-[30px] px-0',
            isListView ? segmentOn : segmentOff
          )}
        >
          {/*list*/}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M17.5 10L7.5 10M17.5 5.00002L7.5 5.00002M17.5 15L7.5 15M4.16667 10C4.16667 10.4603 3.79357 10.8334 3.33333 10.8334C2.8731 10.8334 2.5 10.4603 2.5 10C2.5 9.53978 2.8731 9.16669 3.33333 9.16669C3.79357 9.16669 4.16667 9.53978 4.16667 10ZM4.16667 5.00002C4.16667 5.46026 3.79357 5.83335 3.33333 5.83335C2.8731 5.83335 2.5 5.46026 2.5 5.00002C2.5 4.53978 2.8731 4.16669 3.33333 4.16669C3.79357 4.16669 4.16667 4.53978 4.16667 5.00002ZM4.16667 15C4.16667 15.4603 3.79357 15.8334 3.33333 15.8334C2.8731 15.8334 2.5 15.4603 2.5 15C2.5 14.5398 2.8731 14.1667 3.33333 14.1667C3.79357 14.1667 4.16667 14.5398 4.16667 15Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
