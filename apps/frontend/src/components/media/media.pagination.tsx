'use client';

import { FC, useMemo } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@gitroom/frontend/components/ui/icons';

export const Pagination: FC<{
  current: number;
  totalPages: number;
  setPage: (num: number) => void;
}> = (props) => {
  const t = useT();
  const { current, totalPages, setPage } = props;

  const paginationItems = useMemo(() => {
    const c = current + 1;
    const m = totalPages;

    if (m <= 10) {
      return Array.from({ length: m }, (_, i) => i + 1);
    }

    const delta = 3;
    const left = c - delta;
    const right = c + delta + 1;
    const range: number[] = [];
    const rangeWithDots: (number | '...')[] = [];
    let l: number | undefined;

    for (let i = 1; i <= m; i++) {
      if (i === 1 || i === m || (i >= left && i < right)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    while (rangeWithDots.length > 10) {
      const currentIndex = rangeWithDots.findIndex((item) => item === c);
      if (currentIndex !== -1 && currentIndex > rangeWithDots.length / 2) {
        rangeWithDots.splice(2, 1);
      } else {
        rangeWithDots.splice(-3, 1);
      }
    }

    return rangeWithDots;
  }, [current, totalPages]);

  return (
    <ul className="mt-[8px] flex flex-row items-center justify-center gap-1">
      <li className={clsx(current === 0 && 'pointer-events-none opacity-20')}>
        <div
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-1 rounded-md px-4 py-2 ps-2.5 text-sm font-medium text-pqMuted hover:bg-pqHover hover:text-pqText"
          aria-label="Go to previous page"
          onClick={() => setPage(current - 1)}
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span>{t('previous', 'Previous')}</span>
        </div>
      </li>
      {paginationItems.map((item, index) => (
        <li key={index}>
          {item === '...' ? (
            <span className="inline-flex h-10 w-10 select-none items-center justify-center text-pqText">
              ...
            </span>
          ) : (
            <div
              aria-current="page"
              onClick={() => setPage(item - 1)}
              className={clsx(
                'inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-pqBorder text-sm font-medium hover:bg-pqHover',
                current === item - 1
                  ? 'bg-pqBrand !text-pqOnBrand'
                  : 'text-pqText'
              )}
            >
              {item}
            </div>
          )}
        </li>
      ))}
      <li
        className={clsx(
          current + 1 === totalPages && 'pointer-events-none opacity-20'
        )}
      >
        <a
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-1 rounded-md px-4 py-2 pe-2.5 text-sm font-medium text-pqMuted hover:bg-pqHover hover:text-pqText"
          aria-label="Go to next page"
          onClick={() => setPage(current + 1)}
        >
          <span>{t('next', 'Next')}</span>
          <ChevronRightIcon className="h-4 w-4" />
        </a>
      </li>
    </ul>
  );
};
