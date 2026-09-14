'use client';

import { FC, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import type { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { channelListSubtitle } from '@gitroom/frontend/components/channels/channel-handle';

export type PickableIntegration = Integrations & { refreshNeeded?: boolean };

/**
 * Design chromeVals chanFilter — the search + counter + tick-row list. Lifted
 * out of ChannelFilter so the calendar popover, Autopost and Webhooks all draw
 * the same rows instead of three different ideas of what picking a channel
 * looks like.
 */
export const ChannelPickList: FC<{
  integrations: PickableIntegration[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  // Receives what is currently on screen — with a search active, "Select all"
  // meaning "all 20 channels" instead of "these 3" is a trap. Callers ADD these
  // to the current selection; replacing would drop off-screen picks.
  onSelectAll: (visible: PickableIntegration[]) => void;
  onClear: () => void;
  // Below this many channels the search box is noise.
  searchThreshold?: number;
}> = (props) => {
  const {
    integrations,
    selectedIds,
    onToggle,
    onSelectAll,
    onClear,
    searchThreshold = 8,
  } = props;
  const t = useT();
  const [search, setSearch] = useState('');

  const showSearch = integrations.length >= searchThreshold;

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

  const active = selectedIds.length > 0;

  return (
    <div data-pq="channel-pick-list" className="flex flex-col">
      {showSearch && (
        <div className="border-b border-pqLine p-[10px] pb-[8px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            // Both editors put this inside their <form>, next to a submit
            // button — without this, Enter after typing a channel name saves
            // the rule.
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            placeholder={t('search_channels', 'Search channels…')}
            className="h-[32px] w-full rounded-pqSm border border-pqBorder bg-pqBg px-[10px] text-[13px] text-pqText outline-none"
          />
        </div>
      )}
      <div className="flex items-center gap-[8px] border-b border-pqLine px-[12px] py-[7px]">
        <span className="flex-1 text-[11.5px] text-pqSoft">
          {active
            ? t('n_of_m_selected', '{n} of {m} selected')
                .replace('{n}', String(selectedIds.length))
                .replace('{m}', String(integrations.length))
            : t('n_channels', '{count} channels').replace(
                '{count}',
                String(integrations.length)
              )}
          {/* The counter above always counts the whole list, but "Select all"
              next to it acts on what the search left — say so, rather than
              leaving the two silently disagreeing. */}
          {filtered.length !== integrations.length && (
            <>
              {' · '}
              {t('n_shown', '{count} shown').replace(
                '{count}',
                String(filtered.length)
              )}
            </>
          )}
        </span>
        <button
          type="button"
          // Disabled on an empty result: in the calendar filter an empty
          // selection means "all channels", so "Select all" over nothing
          // selected everything — the exact opposite of the label.
          disabled={!filtered.length}
          onClick={() => onSelectAll(filtered)}
          className={clsx(
            'border-0 bg-transparent p-0 text-[11.5px] font-[600]',
            filtered.length ? 'text-pqBrand' : 'text-pqMuted'
          )}
        >
          {t('select_all', 'Select all')}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="border-0 bg-transparent p-0 text-[11.5px] font-[600] text-pqSoft"
        >
          {t('clear', 'Clear')}
        </button>
      </div>
      <div className="max-h-[260px] overflow-y-auto p-[6px] scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner">
        {!filtered.length && (
          <div className="px-[8px] py-[12px] text-[12.5px] text-pqSoft">
            {/* An empty source list is not a failed search. Callers filter out
                disabled / reconnect-needed / half-connected channels, so this
                reads "nothing matched" to someone who never typed anything. */}
            {!integrations.length
              ? t(
                  'no_channels_available_to_pick',
                  'No channels available to pick — connect one, or reconnect the ones that need it.'
                )
              : t('no_channels_match', 'No channels match that search.')}
          </div>
        )}
        {filtered.map((integration) => {
          const on = selectedIds.includes(integration.id);
          return (
            <button
              key={integration.id}
              type="button"
              onClick={() => onToggle(integration.id)}
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
                  {channelListSubtitle(integration)}
                </span>
              </span>
              {integration.refreshNeeded && (
                <span
                  aria-hidden
                  data-tooltip-id="tooltip"
                  data-tooltip-content={t(
                    'channel_needs_reconnect',
                    'Needs to be reconnected'
                  )}
                  className="size-[6px] shrink-0 rounded-full bg-pqWarn"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
