'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useClickOutside } from '@mantine/hooks';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { FilterIcon } from '@gitroom/frontend/components/ui/icons';

export const SelectChannels: FC = () => {
  const { integrations, customer, selectedChannels, setSelectedChannels } =
    useCalendar();
  const t = useT();
  const [pos, setPos] = useState<any>({});
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => {
    if (open) {
      setOpen(false);
    }
  });

  const channels = useMemo(
    () =>
      integrations.filter((i) => !customer || i.customer?.id === customer),
    [integrations, customer]
  );

  const selectedIds = selectedChannels ?? channels.map((c) => c.id);
  const allSelected = channels.every((c) => selectedIds.includes(c.id));

  const openClose = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }

    const { x, y, height } = ref.current?.getBoundingClientRect();
    setPos({ top: y + height, left: Math.min(x, window.innerWidth - 270) });
    setOpen(true);
  }, [open]);

  const toggleAll = useCallback(() => {
    setSelectedChannels(allSelected ? [] : null);
  }, [allSelected]);

  const toggle = useCallback(
    (id: string) => () => {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id];
      setSelectedChannels(next.length === channels.length ? null : next);
    },
    [selectedIds, channels]
  );

  if (channels.length <= 1) {
    return null;
  }

  return (
    <div className="relative select-none z-[500]" ref={ref}>
      <div
        data-tooltip-id="tooltip"
        data-tooltip-content={t('select_channels_tooltip', 'Select Channels')}
        onClick={openClose}
        className={clsx(
          'relative z-[20] cursor-pointer h-[42px] rounded-[8px] px-[12px] border flex items-center',
          open || !allSelected ? 'border-[#612BD3]' : 'border-newColColor'
        )}
      >
        <FilterIcon />
      </div>
      {open && (
        <div
          style={pos}
          className="flex flex-col fixed py-[12px] bg-newBgColorInner menu-shadow min-w-[250px] max-h-[320px] overflow-y-auto"
        >
          <div className="p-[12px] hover:bg-newBgColor text-[14px] font-[600] flex items-center">
            <Checkbox
              disableForm={true}
              checked={allSelected}
              onChange={toggleAll}
              label={t('select_all', 'Select all')}
            />
          </div>
          {channels.map((p) => (
            <div
              key={p.id}
              className="p-[12px] hover:bg-newBgColor text-[14px] font-[500] flex items-center gap-[10px]"
            >
              <Checkbox
                disableForm={true}
                checked={selectedIds.includes(p.id)}
                onChange={toggle(p.id)}
              />
              <img
                className="w-[24px] h-[24px] rounded-full"
                src={p.picture || '/no-picture.jpg'}
                alt=""
              />
              <div className="truncate">{p.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
