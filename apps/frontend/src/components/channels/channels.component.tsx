'use client';

import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { TimeTable } from '@gitroom/frontend/components/launches/time.table';
import { Menu } from '@gitroom/frontend/components/launches/menu/menu';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { SettingsModal } from '@gitroom/frontend/components/launches/settings.modal';
import { AddProviderComponent } from '@gitroom/frontend/components/launches/add.provider.component';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { CalendarWeekProvider } from '@gitroom/frontend/components/launches/calendar.context';
import { ChannelAutomations } from '@gitroom/frontend/components/channels/channel.automations';

/**
 * Channels page — design's list + detail (or inline Add Channel pane).
 * Calendar no longer hosts the channel column; this is the home for connect,
 * reconnect, publishing options and time slots.
 */

type ChFilter = 'all' | 'connected' | 'attention';

const needsAttention = (integration: any) =>
  !!(integration.refreshNeeded || integration.inBetweenSteps);

const ChannelCounts: FC<{ integrationId: string }> = ({ integrationId }) => {
  const t = useT();
  const fetch = useFetch();
  const { data } = useSWR(
    `/posts/count?integration=${integrationId}`,
    async (path: string) =>
      (await (await fetch(path)).json()) as Record<string, number>,
    { revalidateOnFocus: false }
  );

  const cells: Array<[string, string, string]> = [
    [t('scheduled', 'Scheduled'), 'scheduled', 'var(--brand)'],
    [t('drafts', 'Drafts'), 'draft', 'var(--amber)'],
    [t('published', 'Published'), 'published', 'var(--ok)'],
  ];

  return (
    <div className="grid grid-cols-3 gap-[10px]">
      {cells.map(([label, key, dot]) => (
        <div
          key={key}
          data-channel-count={label}
          className="rounded-pqMd border border-pqBorder p-[14px]"
        >
          <div className="flex items-center gap-[6px]">
            <span
              className="h-[6px] w-[6px] rounded-full"
              style={{ background: dot }}
            />
            <span className="text-[11px] font-[600] uppercase tracking-[0.06em] text-pqSoft">
              {label}
            </span>
          </div>
          <div className="mt-[6px] text-[21px] font-[600] tabular-nums">
            {data ? data[key] ?? 0 : '—'}
          </div>
        </div>
      ))}
    </div>
  );
};

const PublishingOptions: FC<{ integration: any; mutate: () => void }> = ({
  integration,
  mutate,
}) => {
  const t = useT();
  const modal = useModals();
  const toast = useToaster();

  const options: any[] = useMemo(() => {
    try {
      const parsed = JSON.parse(integration.additionalSettings || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [integration.additionalSettings]);

  const open = useCallback(() => {
    modal.openModal({
      title: t('additional_settings', 'Additional Settings'),
      children: (
        <SettingsModal
          integration={integration}
          onClose={() => {
            mutate();
            toast.show(t('settings_updated', 'Settings Updated'), 'success');
          }}
        />
      ),
    });
  }, [integration, modal, mutate, t, toast]);

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex items-baseline gap-[8px]">
        <span className="text-[11px] font-[700] uppercase tracking-[0.08em] text-pqSoft">
          {t('publishing_options', 'Publishing options')}
        </span>
        <span className="h-[1px] flex-1 bg-pqLine" />
      </div>
      <div
        data-publishing-options={options.length}
        className="flex items-center gap-[14px] rounded-pqMd border border-pqBorder bg-pqPop p-[16px]"
      >
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-[500]">
            {options.length
              ? t('n_publishing_options', '{count} publishing options').replace(
                  '{count}',
                  String(options.length)
                )
              : t(
                  'no_publishing_options',
                  'This channel has no extra publishing options'
                )}
          </div>
          {!!options.length && (
            <div className="mt-[3px] truncate text-[12.5px] text-pqMuted">
              {options.map((option) => option.title).join(' · ')}
            </div>
          )}
        </div>
        {!!options.length && (
          <button
            type="button"
            onClick={open}
            className="shrink-0 rounded-pqSm bg-pqBtnSimple px-[14px] py-[8px] text-[13px] font-[600] text-pqText transition-colors hover:bg-pqHover"
          >
            {t('edit', 'Edit')}
          </button>
        )}
      </div>
    </div>
  );
};

export const ChannelsComponent: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toast = useToaster();
  const { data: integrations, mutate } = useIntegrationList();
  const [selected, setSelected] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [providerCatalog, setProviderCatalog] = useState<any>(null);
  const [filter, setFilter] = useState<ChFilter>('all');
  const publishingRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => integrations || [], [integrations]);

  const filtered = useMemo(() => {
    return list.filter((integration: any) => {
      if (filter === 'connected') return !needsAttention(integration);
      if (filter === 'attention') return needsAttention(integration);
      return true;
    });
  }, [list, filter]);

  const attentionCount = useMemo(
    () => list.filter(needsAttention).length,
    [list]
  );

  const current = useMemo(() => {
    const inFiltered = filtered.find((i: any) => i.id === selected);
    if (inFiltered) return inFiltered;
    return filtered[0] || list.find((i: any) => i.id === selected) || list[0];
  }, [filtered, list, selected]);

  useEffect(() => {
    if (!list.length) {
      setAdding(true);
    }
  }, [list.length]);

  useEffect(() => {
    if (!selected && filtered[0]?.id) {
      setSelected(filtered[0].id);
    }
  }, [filtered, selected]);

  const loadCatalog = useCallback(async () => {
    if (providerCatalog) return providerCatalog;
    const data = await (await fetch('/integrations')).json();
    setProviderCatalog(data);
    return data;
  }, [fetch, providerCatalog]);

  const openAdd = useCallback(async () => {
    await loadCatalog();
    setAdding(true);
  }, [loadCatalog]);

  const closeAdd = useCallback(() => {
    setAdding(false);
  }, []);

  const afterConnect = useCallback(() => {
    mutate();
    setAdding(false);
  }, [mutate]);

  const openComposer = useCallback(async () => {
    if (!current) return;
    const slot = await (
      await fetch(`/posts/find-slot/${current.id}`)
    ).json();
    modal.openModal({
      id: 'add-edit-modal',
      closeOnClickOutside: false,
      removeLayout: true,
      closeOnEscape: false,
      withCloseButton: false,
      askClose: true,
      fullScreen: true,
      classNames: {
        modal: 'w-[100%] max-w-[1400px] text-textColor',
      },
      children: (
        <AddEditModal
          allIntegrations={list.map((p: any) => ({ ...p }))}
          mutate={() => mutate()}
          integrations={list}
          selectedChannels={[current.id]}
          date={dayjs.utc(slot.date).local()}
          reopenModal={() => {}}
        />
      ),
      title: ``,
    });
  }, [current, fetch, list, modal, mutate]);

  const openPublishing = useCallback(() => {
    publishingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!current) return;
    try {
      const parsed = JSON.parse(current.additionalSettings || '[]');
      if (!Array.isArray(parsed) || !parsed.length) return;
    } catch {
      return;
    }
    modal.openModal({
      title: t('additional_settings', 'Additional Settings'),
      children: (
        <SettingsModal
          integration={current}
          onClose={() => {
            mutate();
            toast.show(t('settings_updated', 'Settings Updated'), 'success');
          }}
        />
      ),
    });
  }, [current, modal, mutate, t, toast]);

  const openSlots = useCallback(() => {
    slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const reconnect = useCallback(async () => {
    if (!current) return;
    const { url } = await (
      await fetch(
        `/integrations/social/${current.identifier}?refresh=${current.internalId}`,
        { method: 'GET' }
      )
    ).json();
    if (!url) {
      toast.show(
        t(
          'could_not_connect_platform',
          'Could not connect to the platform, please try again later'
        ),
        'warning'
      );
      return;
    }
    window.location.href = url;
  }, [current, fetch, t, toast]);

  const filters: Array<[ChFilter, string, number]> = [
    ['all', t('filter_all', 'All'), list.length],
    [
      'connected',
      t('filter_connected', 'Connected'),
      list.length - attentionCount,
    ],
    [
      'attention',
      t('filter_needs_attention', 'Needs attention'),
      attentionCount,
    ],
  ];

  const addPane = !!adding && !!providerCatalog && (
    <div
      data-channel-add="1"
      className="flex min-w-0 flex-1 flex-col gap-[16px] overflow-y-auto bg-pqInner p-[24px]"
    >
      <div className="flex items-center gap-[12px]">
        {!!list.length && (
          <button
            type="button"
            onClick={closeAdd}
            className="flex h-[32px] w-[32px] items-center justify-center rounded-pqSm text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText"
            aria-label={t('back', 'Back')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[21px] font-[600] -tracking-[0.01em]">
            {t('add_channel', 'Add Channel')}
          </div>
          <div className="mt-[2px] text-[12.5px] text-pqMuted">
            {t('pick_a_platform_to_connect', 'Pick a platform to connect.')}
          </div>
        </div>
      </div>
      <AddProviderComponent
        invite={false}
        update={afterConnect}
        {...providerCatalog}
      />
    </div>
  );

  if (!list.length) {
    return (
      <CalendarWeekProvider integrations={list}>
        <div className="flex min-h-0 flex-1 gap-[1px] bg-newBgLineColor">
          {addPane || (
            <div className="flex flex-1 flex-col items-center justify-center gap-[10px] p-[40px] text-center">
              <div className="text-[18px] font-[600]">
                {t('no_channels', 'No channels yet')}
              </div>
              <div className="max-w-[380px] text-[13.5px] text-pqMuted">
                {t('connect_your_accounts')}
              </div>
              <button
                type="button"
                data-tour="channel-connect"
                onClick={openAdd}
                className="mt-[6px] rounded-pqSm bg-pqBrand px-[16px] py-[9px] text-[13.5px] font-[600] text-pqOnBrand"
              >
                {t('add_channel', 'Add Channel')}
              </button>
            </div>
          )}
        </div>
      </CalendarWeekProvider>
    );
  }

  return (
    <CalendarWeekProvider integrations={list}>
    <div className="flex min-h-0 flex-1 gap-[1px] bg-newBgLineColor">
      <div className="flex w-[300px] shrink-0 flex-col gap-[6px] overflow-y-auto bg-pqInner p-[16px] max-mobile:w-[100%] max-mobile:max-w-[100%]">
        <div className="mb-[4px] flex items-baseline gap-[8px]">
          <span className="text-[11px] font-[700] uppercase tracking-[0.08em] text-pqSoft">
            {t('channels', 'Channels')}
          </span>
          <span className="text-[11px] font-[600] text-pqSoft opacity-70">
            {list.length}
          </span>
        </div>
        <button
          type="button"
          data-tour="channel-connect"
          data-pq="add-channel"
          onClick={openAdd}
          className={clsx(
            'mb-[4px] flex h-[34px] items-center justify-center gap-[6px] rounded-pqSm text-[13px] font-[600] transition-colors',
            adding
              ? 'bg-pqBrand text-pqOnBrand'
              : 'bg-pqBtnSimple text-pqText hover:bg-pqHover'
          )}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          {t('add_channel', 'Add Channel')}
        </button>

        <div className="mb-[6px] flex flex-wrap gap-[4px]">
          {filters.map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={clsx(
                'flex h-[28px] items-center gap-[6px] rounded-pqSm px-[10px] text-[12px] transition-colors',
                filter === key
                  ? 'bg-pqInner font-[600] text-pqText shadow-[inset_0_0_0_1px_var(--border)]'
                  : 'font-[500] text-pqMuted hover:text-pqText'
              )}
            >
              {label}
              <span
                className={clsx(
                  'rounded-[999px] px-[6px] text-[11px] font-[600]',
                  filter === key
                    ? 'bg-pqBtnSimple text-pqMuted'
                    : 'text-pqSoft'
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {!!attentionCount && filter !== 'attention' && (
          <button
            type="button"
            onClick={() => setFilter('attention')}
            className="mb-[6px] rounded-pqMd bg-pqAmberSoft px-[12px] py-[10px] text-start text-[12.5px] leading-[1.45] text-pqText shadow-[inset_0_0_0_1px_var(--amberLine)]"
          >
            {attentionCount === 1
              ? t(
                  'one_channel_lost_connection',
                  '1 channel lost its connection and will not publish until you reconnect it.'
                )
              : t(
                  'n_channels_lost_connection',
                  '{count} channels lost their connection and will not publish until you reconnect them.'
                ).replace('{count}', String(attentionCount))}
          </button>
        )}

        {filtered.map((integration: any) => (
          <button
            key={integration.id}
            type="button"
            data-channel={integration.id}
            onClick={() => {
              setSelected(integration.id);
              setAdding(false);
            }}
            className={clsx(
              'flex items-center gap-[10px] rounded-pqSm p-[8px] text-start transition-colors',
              !adding && current?.id === integration.id
                ? 'bg-pqNavActive'
                : 'hover:bg-pqHover'
            )}
          >
            <span className="relative shrink-0">
              <ImageWithFallback
                fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                src={integration.picture || '/no-picture.jpg'}
                alt={integration.identifier}
                width={32}
                height={32}
                className="rounded-full"
              />
              <img
                src={`/icons/platforms/${integration.identifier}.png`}
                alt=""
                className="absolute -bottom-[2px] -end-[2px] h-[15px] w-[15px] rounded-full border border-pqInner"
              />
              {needsAttention(integration) && (
                <span className="absolute -start-[2px] -top-[2px] flex h-[15px] w-[15px] items-center justify-center rounded-full bg-pqWarn text-[10px] font-[700] text-white">
                  !
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-[500]">
                {integration.name}
              </span>
              <span
                className={clsx(
                  'block truncate text-[11.5px]',
                  needsAttention(integration) ? 'text-pqWarn' : 'text-pqMuted'
                )}
              >
                {needsAttention(integration)
                  ? t('channel_disconnected', 'Channel disconnected')
                  : integration.identifier}
              </span>
            </span>
          </button>
        ))}
        {!filtered.length && (
          <div className="px-[4px] py-[16px] text-[12.5px] text-pqMuted">
            {t('no_channels_in_filter', 'No channels in this filter.')}
          </div>
        )}
      </div>

      {addPane}

      {!adding && !!current && (
        <div
          data-channel-detail={current.id}
          className="flex min-w-0 flex-1 flex-col gap-[20px] overflow-y-auto bg-pqInner p-[24px] max-mobile:hidden"
        >
          <div className="flex items-center gap-[14px]">
            <ImageWithFallback
              fallbackSrc={`/icons/platforms/${current.identifier}.png`}
              src={current.picture || '/no-picture.jpg'}
              alt={current.identifier}
              width={52}
              height={52}
              className="rounded-full"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[21px] font-[600] -tracking-[0.01em]">
                {current.name}
              </div>
              <div className="mt-[2px] flex items-center gap-[8px] text-[12.5px] text-pqMuted">
                <span>{current.identifier}</span>
                <span
                  className={clsx(
                    'rounded-[5px] px-[6px] py-[1px] text-[10.5px] font-[700]',
                    needsAttention(current)
                      ? 'bg-pqAmberSoft text-pqAmber'
                      : 'bg-pqOkSoft text-pqOk'
                  )}
                >
                  {needsAttention(current)
                    ? t('needs_reconnect', 'Needs reconnecting')
                    : t('channel_connected', 'Connected')}
                </span>
              </div>
            </div>
            <Menu
              id={current.id}
              canEnable={!!current.disabled}
              canDisable={!current.disabled}
              canChangeProfilePicture={!!current.changeProfilePicture}
              canChangeNickName={!!current.changeNickName}
              refreshChannel={() => reconnect}
              mutate={mutate}
              onChange={() => mutate()}
            />
          </div>

          <div className="flex flex-wrap gap-[7px]">
            <button
              type="button"
              onClick={openComposer}
              className="flex h-[34px] items-center gap-[7px] rounded-pqSm bg-pqBrand pe-[13px] ps-[11px] text-[13px] font-[600] text-pqOnBrand"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                <path
                  d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t('new_post', 'New post')}
            </button>
            {needsAttention(current) && (
              <button
                type="button"
                onClick={reconnect}
                className="flex h-[34px] items-center gap-[7px] rounded-pqSm bg-pqAmberSoft pe-[13px] ps-[11px] text-[13px] font-[600] text-pqAmber"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                  <path
                    d="M20 11.5A8 8 0 0 0 6.3 6.3L4 8.5M4 4v4.5h4.5M4 12.5a8 8 0 0 0 13.7 5.2L20 15.5M20 20v-4.5h-4.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t('reconnect', 'Reconnect')}
              </button>
            )}
            <button
              type="button"
              onClick={openPublishing}
              className="h-[34px] rounded-pqSm bg-pqBtnSimple px-[13px] text-[13px] font-[500] text-pqText transition-colors hover:bg-pqHover"
            >
              {t('publishing_options', 'Publishing options')}
            </button>
            <button
              type="button"
              onClick={openSlots}
              className="h-[34px] rounded-pqSm bg-pqBtnSimple px-[13px] text-[13px] font-[500] text-pqText transition-colors hover:bg-pqHover"
            >
              {t('time_slots', 'Time slots')}
            </button>
          </div>

          {needsAttention(current) && (
            <div className="flex items-center gap-[11px] rounded-pqMd bg-pqAmberSoft px-[14px] py-[12px] shadow-[inset_0_0_0_1px_var(--amberLine)]">
              <svg
                viewBox="0 0 24 24"
                width="17"
                height="17"
                fill="none"
                className="shrink-0 text-pqAmber"
              >
                <path
                  d="M12 9v4M12 16.5h.01M10.3 3.9 2.6 17.2A1.9 1.9 0 0 0 4.3 20h15.4a1.9 1.9 0 0 0 1.7-2.8L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="min-w-0 flex-1 text-[13px] leading-[1.5]">
                {t(
                  'channel_lost_connection_banner',
                  'This channel lost its connection and will not publish until you reconnect it.'
                )}
              </div>
              <button
                type="button"
                onClick={reconnect}
                className="h-[30px] shrink-0 rounded-pqSm bg-pqInner px-[12px] text-[12.5px] font-[600] text-pqText shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover"
              >
                {t('reconnect', 'Reconnect')}
              </button>
            </div>
          )}

          <ChannelCounts integrationId={current.id} />

          <ChannelAutomations integration={current} />

          <div ref={publishingRef}>
            <PublishingOptions integration={current} mutate={mutate} />
          </div>

          <div ref={slotsRef} className="flex flex-col gap-[8px]">
            <div className="flex items-baseline gap-[8px]">
              <span className="text-[11px] font-[700] uppercase tracking-[0.08em] text-pqSoft">
                {t('time_table_slots', 'Time Table Slots')}
              </span>
              <span className="h-[1px] flex-1 bg-pqLine" />
            </div>
            <div className="rounded-pqMd border border-pqBorder bg-pqPop p-[16px]">
              <TimeTable integration={current} mutate={mutate} />
            </div>
          </div>
        </div>
      )}
    </div>
    </CalendarWeekProvider>
  );
};
