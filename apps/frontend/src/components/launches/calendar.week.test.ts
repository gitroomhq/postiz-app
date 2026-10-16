import React, { useContext } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import dayjs from 'dayjs';
import { CalendarContext, CalendarWeekProvider } from './calendar.context';
import { Filters } from './filters';
import { getDateRange } from './calendar.date.range';

jest.mock('reflect-metadata', () => ({}), { virtual: true });
jest.mock('react-use-cookie', () => () => ['week', jest.fn()], {
  virtual: true,
});
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
jest.mock('swr', () => () => ({ isLoading: false, mutate: jest.fn() }), {
  virtual: true,
});
jest.mock('@gitroom/helpers/utils/custom.fetch', () => ({
  useFetch: () => jest.fn(),
}));
jest.mock('@gitroom/helpers/utils/timer', () => ({ timer: jest.fn() }));
jest.mock('@gitroom/helpers/utils/posts.list.minify', () => ({
  expandPosts: jest.fn(),
  expandPostsList: jest.fn(),
}));
jest.mock('@gitroom/frontend/components/layout/set.timezone', () => ({
  newDayjs: (value?: string) => jest.requireActual('dayjs')(value),
}));
jest.mock('@gitroom/react/translation/get.transation.service.client', () => ({
  useT: () => (_key: string, fallback: string) => fallback,
}));
jest.mock('./select.customer', () => ({ SelectCustomer: () => null }));
jest.mock('./select.channels', () => ({ SelectChannels: () => null }));
jest.mock('@gitroom/frontend/components/ui/bottom.sheet.component', () => ({
  BottomSheet: () => null,
}));
jest.mock('@gitroom/frontend/components/ui/icons', () => ({
  FilterIcon: () => null,
}));

const Range = () => {
  const { startDate, endDate, weekStart, customer } =
    useContext(CalendarContext);
  return React.createElement(
    'output',
    { 'data-testid': 'range' },
    JSON.stringify({ startDate, endDate, weekStart, customer })
  );
};

function openCalendar(query = '') {
  window.history.replaceState(null, '', `/launches${query}`);
  return render(
    React.createElement(
      CalendarWeekProvider,
      { integrations: [], children: null },
      React.createElement(Filters),
      React.createElement(Range)
    )
  );
}

function range() {
  return JSON.parse(screen.getByTestId('range').textContent!);
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-16T12:00:00'));
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false }),
  });
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

it('toggles Week to seven days from today and back, retaining the customer', () => {
  openCalendar('?customer=example');
  expect(range()).toEqual({
    startDate: '2026-10-12',
    endDate: '2026-10-18',
    weekStart: 'monday',
    customer: 'example',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Week' }));
  expect(range()).toEqual({
    startDate: '2026-10-16',
    endDate: '2026-10-22',
    weekStart: 'today',
    customer: 'example',
  });
  expect(window.location.search).toContain('weekStart=today');
  fireEvent.click(screen.getByRole('button', { name: '7 days' }));
  expect(range().startDate).toBe('2026-10-12');
  expect(range().weekStart).toBe('monday');
  expect(window.location.search).not.toContain('weekStart=today');
});

it('keeps the rolling start for navigation and makes Today the first column', () => {
  openCalendar('?weekStart=today');
  fireEvent.click(screen.getByRole('button', { name: 'Next period' }));
  expect(range()).toMatchObject({
    startDate: '2026-10-23',
    endDate: '2026-10-29',
    weekStart: 'today',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Previous period' }));
  expect(range().startDate).toBe('2026-10-16');
  fireEvent.click(screen.getByRole('button', { name: 'Previous period' }));
  expect(range().startDate).toBe('2026-10-09');
  fireEvent.click(screen.getByRole('button', { name: 'Today' }));
  expect(range()).toMatchObject({
    startDate: '2026-10-16',
    endDate: '2026-10-22',
    weekStart: 'today',
  });
});

it('preserves rolling mode after reloading its URL', () => {
  const view = openCalendar();
  fireEvent.click(screen.getByRole('button', { name: 'Week' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next period' }));
  const url = window.location.search;
  view.unmount();
  openCalendar(url);
  expect(range()).toMatchObject({
    startDate: '2026-10-23',
    endDate: '2026-10-29',
    weekStart: 'today',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Today' }));
  expect(range().startDate).toBe('2026-10-16');
});

it('can select rolling mode on Monday even when the visible dates coincide', () => {
  jest.setSystemTime(new Date('2026-10-19T12:00:00'));
  openCalendar();
  fireEvent.click(screen.getByRole('button', { name: 'Week' }));
  expect(range()).toMatchObject({
    startDate: '2026-10-19',
    endDate: '2026-10-25',
    weekStart: 'today',
  });
  expect(screen.getByRole('button', { name: '7 days' })).toBeTruthy();
  expect(window.location.search).toContain('weekStart=today');
});

it('enters the conventional week first from the day view', () => {
  openCalendar('?display=day&weekStart=today');
  fireEvent.click(screen.getByRole('button', { name: 'Week' }));
  expect(range()).toMatchObject({
    startDate: '2026-10-12',
    endDate: '2026-10-18',
    weekStart: 'monday',
  });
});

it('keeps Today in the conventional week anchored on Monday', () => {
  openCalendar('?startDate=2026-10-19&endDate=2026-10-25');
  fireEvent.click(screen.getByRole('button', { name: 'Today' }));
  expect(range()).toMatchObject({
    startDate: '2026-10-12',
    endDate: '2026-10-18',
    weekStart: 'monday',
  });
});

it.each([
  ['2026-10-23', '2026-10-29'], // Europe/Berlin daylight-saving change.
  ['2026-12-29', '2027-01-04'],
  ['2028-02-27', '2028-03-04'],
])('shows exactly seven calendar dates from %s through %s', (start, end) => {
  expect(getDateRange('week', dayjs(start), 'today')).toEqual({
    startDate: start,
    endDate: end,
  });
});

it('does not apply the rolling-week option to day, month or list ranges', () => {
  const date = dayjs('2026-10-16');
  for (const display of ['day', 'month', 'list']) {
    expect(getDateRange(display, date, 'today')).toEqual(
      getDateRange(display, date, 'monday')
    );
  }
});
