 'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import clsx from 'clsx';
import { useClickOutside } from '@mantine/hooks';
import { TagIcon, DropdownArrowIcon, CheckmarkIcon } from '@gitroom/frontend/components/ui/icons';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const TagFilter: FC = () => {
  const fetch = useFetch();
  const { data } = useSWR('load-tags', useCallback(async () => (await fetch('/posts/tags')).json(), [fetch]));
  const calendar = useCalendar();
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useClickOutside(() => setIsOpen(false));
  const initialSelected = useMemo(() => {
    if (!calendar || !calendar.tagId) return [];
    return String(calendar.tagId).split(',').filter(Boolean);
  }, [calendar]);
  const [selected, setSelected] = useState<string[]>(initialSelected || []);

  const toggle = useCallback((id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }, []);

  const applyFilter = useCallback(() => {
    calendar.setFilters({
      startDate: calendar.startDate,
      endDate: calendar.endDate,
      display: calendar.display as any,
      customer: calendar.customer,
      tagId: selected.length ? selected.join(',') : null,
    });
    setIsOpen(false);
  }, [selected, calendar]);

  const clearFilter = useCallback(() => {
    setSelected([]);
    calendar.setFilters({
      startDate: calendar.startDate,
      endDate: calendar.endDate,
      display: calendar.display as any,
      customer: calendar.customer,
      tagId: null,
    });
    setIsOpen(false);
  }, [calendar]);

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={clsx('border rounded-[8px] h-[42px] px-[12px] flex items-center gap-[8px] cursor-pointer', isOpen ? 'border-[#612BD3]' : 'border-newTableBorder')}
      >
        <TagIcon />
        <div className="text-[14px] font-[500]">
          {selected.length === 0 ? t('tags', 'Tags') : `${selected.length} selected`}
        </div>
        <div className="ms-auto">
          <DropdownArrowIcon rotated={isOpen} />
        </div>
      </div>
      {isOpen && (
        <div className="z-[300] absolute start-0 top-[calc(100%+8px)] w-[260px] bg-newBgColorInner p-[8px] menu-shadow flex flex-col">
          {(data?.tags || []).map((tag: any) => (
            <div key={tag.id} className="flex items-center gap-2 py-2 px-2 rounded" onClick={() => toggle(tag.id)}>
              <div className={clsx('w-[20px] h-[20px] rounded flex items-center justify-center border', selected.includes(tag.id) && 'bg-[#612BD3]')}>
                {selected.includes(tag.id) ? <CheckmarkIcon className="text-white" /> : null}
              </div>
              <div className="h-full flex items-center flex-1 break-all">
                <span
                  className="text-[#fff] px-[8px] rounded-[8px] text-shadow-tags"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            <button onClick={applyFilter} className="flex-1 bg-[#612BD3] text-white py-2 rounded">{t('filter', 'Filter')}</button>
            <button onClick={clearFilter} className="flex-1 border border-newTableBorder py-2 rounded">{t('clear', 'Clear')}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagFilter;
