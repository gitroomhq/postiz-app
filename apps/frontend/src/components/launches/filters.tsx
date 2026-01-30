'use client';

import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useCallback } from 'react';
import { SelectCustomer } from '@gitroom/frontend/components/launches/select.customer';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import i18next from 'i18next';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';

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

  const previousPage = useCallback(() => {
    if (calendar.listPage > 0) {
      calendar.setListPage(calendar.listPage - 1);
    }
  }, [calendar]);

  const nextPage = useCallback(() => {
    if (calendar.listPage < calendar.listTotalPages - 1) {
      calendar.setListPage(calendar.listPage + 1);
    }
  }, [calendar]);

  return (
    <div className="text-textColor flex flex-col md:flex-row gap-[8px] items-center select-none">
      {!isListView && (
        <div className="flex flex-grow flex-row items-center gap-[10px]">
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
            <div className="min-w-[200px] text-center bg-newBgColorInner h-full flex items-center justify-center">
              <div className="py-[3px] px-[9px] rounded-[5px] transition-all text-[14px]">
                {getDisplayText()}
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
            <div className="text-center flex h-[42px]">
              <div
                onClick={setToday}
                className="hover:text-textItemFocused hover:bg-boxFocused py-[3px] px-[9px] flex justify-center items-center rounded-[8px] transition-all cursor-pointer text-[14px] bg-newBgColorInner border border-newTableBorder"
              >
                {t('today', 'Today')}
              </div>
            </div>
          </div>
        </div>
      )}
      {isListView && (
        <div className="flex flex-grow flex-row items-center gap-[10px]">
          <div className="border h-[42px] border-newTableBorder bg-newTableBorder gap-[1px] flex items-center rounded-[8px] overflow-hidden">
            <div
              onClick={previousPage}
              className={clsx(
                'text-textColor rtl:rotate-180 px-[9px] bg-newBgColorInner h-full flex items-center justify-center',
                calendar.listPage > 0
                  ? 'cursor-pointer hover:text-textItemFocused hover:bg-boxFocused'
                  : 'opacity-50 cursor-not-allowed'
              )}
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
            <div className="min-w-[200px] text-center bg-newBgColorInner h-full flex items-center justify-center">
              <div className="py-[3px] px-[9px] rounded-[5px] transition-all text-[14px]">
                {t('page', 'Page')} {calendar.listPage + 1} {t('of', 'of')} {Math.max(1, calendar.listTotalPages)}
              </div>
            </div>
            <div
              onClick={nextPage}
              className={clsx(
                'text-textColor rtl:rotate-180 px-[9px] bg-newBgColorInner h-full flex items-center justify-center',
                calendar.listPage < calendar.listTotalPages - 1
                  ? 'cursor-pointer hover:text-textItemFocused hover:bg-boxFocused'
                  : 'opacity-50 cursor-not-allowed'
              )}
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
          <div className="flex-1" />
        </div>
      )}
      <SelectCustomer
        customer={calendar.customer as string}
        onChange={(customer: string) => setCustomer(customer)}
        integrations={calendar.integrations}
      />
      {!isListView && (
        <div className="flex flex-row p-[4px] border border-newTableBorder rounded-[8px] text-[14px] font-[500]">
          <div
            className={clsx(
              'pt-[6px] pb-[5px] cursor-pointer w-[74px] text-center rounded-[6px]',
              calendar.display === 'day' && 'text-textItemFocused bg-boxFocused'
            )}
            onClick={setDay}
          >
            {t('day', 'Day')}
          </div>
          <div
            className={clsx(
              'pt-[6px] pb-[5px] cursor-pointer w-[74px] text-center rounded-[6px]',
              calendar.display === 'week' && 'text-textItemFocused bg-boxFocused'
            )}
            onClick={setWeek}
          >
            {t('week', 'Week')}
          </div>
          <div
            className={clsx(
              'pt-[6px] pb-[5px] cursor-pointer w-[74px] text-center rounded-[6px]',
              calendar.display === 'month' && 'text-textItemFocused bg-boxFocused'
            )}
            onClick={setMonth}
          >
            {t('month', 'Month')}
          </div>
        </div>
      )}
      <div className="flex flex-row p-[4px] border border-newTableBorder rounded-[8px] text-[14px] font-[500]">
        <div
          onClick={setCalendarView}
          className={clsx(
            'pt-[6px] pb-[5px] cursor-pointer flex justify-center items-center w-[34px] text-center rounded-[6px]',
            !isListView && 'text-textItemFocused bg-boxFocused'
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
            'pt-[6px] pb-[5px] flex justify-center items-center cursor-pointer w-[34px] text-center rounded-[6px]',
            isListView && 'text-textItemFocused bg-boxFocused'
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
