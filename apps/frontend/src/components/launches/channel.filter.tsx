'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useClickOutside } from '@mantine/hooks';
import {
  useCalendar,
} from '@gitroom/frontend/components/launches/calendar.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';

/**
 * Design chromeVals chanFilter — multi-select channels for the calendar grid
 * and posts panel. Empty selection means all channels.
 */
export const ChannelFilter: FC = () => {
  const t = useT();
  const { integrations, channelFilter, setChannelFilter } = useCalendar();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useClickOutside(() => setOpen(false));
  // Trailing-edge toolbar control — prefer end alignment, flip/shift if needed.
  const { referenceRef, floatingRef } = useAnchoredPopover<
    HTMLButtonElement,
    HTMLDivElement
  >(open, 'end');

  const active = channelFilter.length > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (integrations || []).filter((integration) => {
      if (!q) return true;
      return (
        integration.name.toLowerCase().includes(q) ||
        integration.identifier.toLowerCase().includes(q)
      );
    });
  }, [integrations, search]);

  const toggle = useCallback(
    (id: string) => {
      if (channelFilter.includes(id)) {
        setChannelFilter(channelFilter.filter((x) => x !== id));
        return;
      }
      setChannelFilter([...channelFilter, id]);
    },
    [channelFilter, setChannelFilter]
  );

  const selectAll = useCallback(() => {
    setChannelFilter((integrations || []).map((i) => i.id));
  }, [integrations, setChannelFilter]);

  const clear = useCallback(() => {
    setChannelFilter([]);
  }, [setChannelFilter]);

  const stack = useMemo(
    () =>
      channelFilter
        .map((id) => integrations.find((i) => i.id === id))
        .filter(Boolean)
        .slice(0, 3),
    [channelFilter, integrations]
  );

  if (!integrations?.length) {
    return null;
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        ref={referenceRef}
        data-pq="channel-filter"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex h-[32px] items-center gap-[8px] rounded-pqSm border px-[10px] text-[13px] font-[500] transition-colors',
          active || open
            ? 'border-pqBrand bg-pqBrandSoft text-pqFocused'
            : 'border-pqBorder bg-transparent text-pqMuted hover:border-pqBrand'
        )}
      >
        {active ? (
          <span className="flex items-center">
            {stack.map((integration: any, index) => (
              <span
                key={integration.id}
                className="relative size-[18px] overflow-hidden rounded-[5px] border border-pqInner"
                style={{ marginInlineStart: index ? -6 : 0, zIndex: 3 - index }}
              >
                <ImageWithFallback
                  fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                  src={integration.picture || '/no-picture.jpg'}
                  alt=""
                  width={18}
                  height={18}
                />
              </span>
            ))}
          </span>
        ) : (
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
            <path
              d="M4 5h16M7 12h10M10 19h4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        )}
        <span>
          {active
            ? t('n_channels', '{count} channels').replace(
                '{count}',
                String(channelFilter.length)
              )
            : t('all_channels', 'All channels')}
        </span>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" className="text-pqSoft">
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          ref={floatingRef}
          data-pq="channel-filter-menu"
          className="z-[45] flex w-[290px] flex-col overflow-hidden rounded-pqMd border border-pqBorder bg-pqInner shadow-menu"
        >
          <div className="border-b border-pqLine p-[10px] pb-[8px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search_channels', 'Search channels…')}
              className="h-[32px] w-full rounded-pqSm border border-pqBorder bg-pqBg px-[10px] text-[13px] text-pqText outline-none"
            />
          </div>
          <div className="flex items-center gap-[8px] border-b border-pqLine px-[12px] py-[7px]">
            <span className="flex-1 text-[11.5px] text-pqSoft">
              {active
                ? t('n_of_m_selected', '{n} of {m} selected')
                    .replace('{n}', String(channelFilter.length))
                    .replace('{m}', String(integrations.length))
                : t('n_channels', '{count} channels').replace(
                    '{count}',
                    String(integrations.length)
                  )}
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="border-0 bg-transparent p-0 text-[11.5px] font-[600] text-pqBrand"
            >
              {t('select_all', 'Select all')}
            </button>
            <button
              type="button"
              onClick={clear}
              className="border-0 bg-transparent p-0 text-[11.5px] font-[600] text-pqSoft"
            >
              {t('clear', 'Clear')}
            </button>
          </div>
          <div className="max-h-[260px] overflow-y-auto p-[6px]">
            {filtered.map((integration) => {
              const on = channelFilter.includes(integration.id);
              return (
                <button
                  key={integration.id}
                  type="button"
                  onClick={() => toggle(integration.id)}
                  className="flex w-full items-center gap-[10px] rounded-pqSm px-[8px] py-[7px] text-start text-[13.5px] text-pqText transition-colors hover:bg-pqHover"
                >
                  <span
                    className={clsx(
                      'grid size-[16px] shrink-0 place-items-center rounded-[4px] border-[1.5px]',
                      on
                        ? 'border-pqBrand bg-pqBrand text-pqOnBrand'
                        : 'border-pqBorder bg-transparent'
                    )}
                  >
                    {on && (
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
                        <path
                          d="M5 12.5l4.5 4.5L19 7.5"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="relative size-[22px] shrink-0">
                    <ImageWithFallback
                      fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                      src={integration.picture || '/no-picture.jpg'}
                      alt=""
                      width={22}
                      height={22}
                      className="rounded-[6px]"
                    />
                    <img
                      src={`/icons/platforms/${integration.identifier}.png`}
                      alt=""
                      className="absolute -bottom-[4px] -end-[4px] size-[15px] rounded-full"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-[500]">
                      {integration.name}
                    </span>
                    <span className="block truncate text-[11.5px] text-pqMuted">
                      {integration.identifier}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
