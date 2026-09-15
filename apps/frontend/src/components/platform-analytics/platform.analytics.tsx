'use client';

import useSWR from 'swr';
import { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import { sortIntegrationsByProviderImportance } from '@gitroom/frontend/components/launches/helpers/sort.integrations';
import clsx from 'clsx';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { RenderAnalytics } from '@gitroom/frontend/components/platform-analytics/render.analytics';
import { WorkspaceAnalytics } from '@gitroom/frontend/components/platform-analytics/workspace.analytics';
import { useRouter } from 'next/navigation';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import useCookie from 'react-use-cookie';
import {
  AnalyticsCardsGhost,
  PageContentSkeleton,
} from '@gitroom/frontend/components/layout/loading';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import { TwoColumnDetailDrawer } from '@gitroom/frontend/components/layout/two-column-detail-drawer';
import { MobileSheet } from '@gitroom/frontend/components/layout/mobile-sheet';
import { Menu } from '@gitroom/frontend/components/launches/menu/menu';
import type { Integration } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { ChannelsPageEmpty } from '@gitroom/frontend/components/ui/no-channels-art';
import { channelListSubtitle, channelNameWithHandle } from '@gitroom/frontend/components/channels/channel-handle';

const ALL_CHANNELS = '__all__';

const AllChannelsMosaic: FC<{
  integrations: Array<{ id: string; identifier: string }>;
}> = ({ integrations }) => {
  const shown = integrations.slice(0, 4);
  const extra = Math.max(0, integrations.length - 4);
  return (
    <span
      data-pq="all-channels-mosaic"
      className="relative grid size-[32px] shrink-0 grid-cols-2 grid-rows-2 gap-[1px] overflow-hidden rounded-[8px] bg-pqSettings p-[1px]"
    >
      {shown.map((integration) => (
        <img
          key={integration.id}
          src={`/icons/platforms/${integration.identifier}.png`}
          alt=""
          className="size-full object-cover"
        />
      ))}
      {extra > 0 && (
        <span className="absolute bottom-0 end-0 rounded-pqSm bg-pqInner px-[3px] text-[8px] font-[700] leading-[14px] text-pqText shadow-[inset_0_0_0_1px_var(--border)]">
          +{extra}
        </span>
      )}
    </span>
  );
};

export const PlatformAnalytics = () => {
  const fetch = useFetch();
  const t = useT();
  const router = useRouter();
  const { mobile, tablet, touch } = useViewport();

  const [selected, setSelected] = useState('');
  const [key, setKey] = useState(7);
  const [collapseMenu, setCollapseMenu] = useCookie('collapseMenu', '0');
  const channelsCollapsed = !mobile && collapseMenu === '1';
  const autoCollapsed = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  // Phone: the dashboard is the page. The channel picker is a sheet.
  const [detailOpen, setDetailOpen] = useState(false);
  const [channelSheetOpen, setChannelSheetOpen] = useState(false);
  const toaster = useToaster();

  const selectChannel = useCallback((id: string) => {
    setSelected(id);
    setDetailOpen(true);
    setChannelSheetOpen(false);
  }, []);
  const closeDetail = useCallback(() => setDetailOpen(false), []);

  useEffect(() => {
    if (paneRef.current) {
      paneRef.current.scrollTop = 0;
    }
  }, [selected]);

  const load = useCallback(async () => {
    // customFetch resolves on 4xx/5xx, so `.integrations` was undefined on an
    // error body and `.filter` threw inside the fetcher. SWR swallowed that
    // into `error`, `data` stayed at `fallbackData: []`, and the page told the
    // user they had no channels at all. Throw so SWR reports a real error
    // instead — the same guard `use.integration.list.tsx` carries.
    const response = await fetch('/integrations/list');
    if (!response.ok) {
      throw new Error('Could not load channels');
    }
    const body = await response.json();
    const integrations = Array.isArray(body?.integrations)
      ? body.integrations
      : [];
    return integrations.filter((integration: { analytics?: boolean }) =>
      Boolean(integration.analytics)
    );
  }, [fetch]);

  const { data, isLoading, error, mutate } = useSWR('analytics-list', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });

  const openAddChannel = useCallback(() => {
    router.push('/channels?add=1');
  }, [router]);

  // Design `_autoSide`: collapse under 1180 on viewport transitions only.
  useEffect(() => {
    if (mobile) return;
    if (tablet) {
      autoCollapsed.current = true;
      setCollapseMenu('1', { days: 365 });
      return;
    }
    if (autoCollapsed.current) {
      autoCollapsed.current = false;
      setCollapseMenu('0', { days: 365 });
    }
  }, [mobile, tablet, setCollapseMenu]);

  const toggleCollapse = useCallback(() => {
    autoCollapsed.current = false;
    setCollapseMenu(collapseMenu === '1' ? '0' : '1', { days: 365 });
  }, [collapseMenu, setCollapseMenu]);

  const sortedIntegrations = useMemo(() => {
    return sortIntegrationsByProviderImportance(data || []) as Array<
      Integrations & {
        refreshNeeded?: boolean;
        internalId?: string;
        inBetweenSteps?: boolean;
        changeProfilePicture?: boolean;
        changeNickName?: boolean;
        analytics?: boolean;
        analyticsIntervals?: readonly number[];
        postAnalytics?: boolean;
      }
    >;
  }, [data]);

  // Auto-select All channels when there is more than one reporting channel.
  useEffect(() => {
    if (!sortedIntegrations.length) return;
    if (selected === ALL_CHANNELS && sortedIntegrations.length > 1) {
      return;
    }
    const stillThere = sortedIntegrations.some((i) => i.id === selected);
    if (!selected || !stillThere) {
      setSelected(
        sortedIntegrations.length > 1
          ? ALL_CHANNELS
          : sortedIntegrations[0].id
      );
    }
  }, [sortedIntegrations, selected]);

  const currentIntegration = useMemo(() => {
    if (selected === ALL_CHANNELS) {
      return undefined;
    }
    return (
      sortedIntegrations.find((i) => i.id === selected) ||
      sortedIntegrations[0]
    );
  }, [selected, sortedIntegrations]);

  const refreshChannel = useCallback(
    (
      integration: Integration & {
        identifier: string;
        internalId?: string;
      }
    ) =>
      () => {
        void (async () => {
          const { url } = await (
            await fetch(
              `/integrations/social/${integration.identifier}?refresh=${integration.internalId}`,
              { method: 'GET' }
            )
          ).json();
          if (!url) {
            toaster.show(
              t(
                'could_not_connect_platform',
                'Could not connect to the platform, please try again later'
              ),
              'warning'
            );
            return;
          }
          window.location.href = url;
        })();
      },
    [fetch, t, toaster]
  );

  const onMenuChange = useCallback(
    (shouldReload: boolean) => {
      void mutate().then((fresh) => {
        if (!shouldReload || !fresh) return;
        if (
          selected !== ALL_CHANNELS &&
          !fresh.some((d: { id: string }) => d.id === selected)
        ) {
          setSelected(
            fresh.length > 1 ? ALL_CHANNELS : fresh[0]?.id || ''
          );
        }
      });
    },
    [mutate, selected]
  );

  const options = useMemo(() => {
    if (selected === ALL_CHANNELS) {
      return [
        { key: 7, value: t('7_days', '7 Days') },
        { key: 30, value: t('30_days', '30 Days') },
        { key: 90, value: t('90_days', '90 Days') },
      ];
    }
    if (!currentIntegration) {
      return [];
    }
    return (currentIntegration.analyticsIntervals || []).map((interval) => ({
      key: interval,
      value:
        interval === 7
          ? t('7_days', '7 Days')
          : interval === 30
            ? t('30_days', '30 Days')
            : t('90_days', '90 Days'),
    }));
  }, [currentIntegration, selected, t]);

  const keys = useMemo(() => {
    if (options.find((p) => p.key === key)) {
      return key;
    }
    return options[0]?.key || 7;
  }, [key, options]);

  if (isLoading) {
    return <PageContentSkeleton detail={<AnalyticsCardsGhost />} />;
  }

  // The fetcher throws on a bad response, but that only lands in SWR's `error`
  // — `data` stays at `fallbackData: []`. Without reading it here the page still
  // said "No analytics yet / Connect a channel" to someone who has channels and
  // just hit a failing request.
  if (error && !isLoading) {
    return (
      <div className="flex flex-1 flex-col bg-pqInner">
        <ChannelsPageEmpty
          artClassName="w-[220px]"
          title={t('analytics_load_failed', 'Could not load your channels')}
          description={t(
            'analytics_load_failed_hint',
            'Something went wrong fetching your channels. Check your connection and try again.'
          )}
          action={
            <button
              type="button"
              onClick={() => mutate()}
              className={clsx(
                'mt-[4px] rounded-pqSm bg-pqBrand px-[14px] text-[13px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover',
                touch ? 'h-[44px] min-h-[44px] px-[18px]' : 'h-[34px]'
              )}
            >
              {t('try_again', 'Try again')}
            </button>
          }
        />
      </div>
    );
  }

  if (!sortedIntegrations.length && !isLoading) {
    return (
      <div className="flex flex-1 flex-col bg-pqInner">
        <ChannelsPageEmpty
          artClassName="w-[220px]"
          title={t('no_analytics_yet', 'No analytics yet')}
          description={t(
            'analytics_empty_connect_hint',
            'Connect a channel to collect impressions, engagement and followers. Supported: X, Instagram, LinkedIn, Facebook, TikTok, YouTube, Threads, Pinterest, GMB and more.'
          )}
          action={
            <button
              type="button"
              onClick={openAddChannel}
              className={clsx(
                'mt-[4px] rounded-pqSm bg-pqBrand px-[14px] text-[13px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover',
                touch ? 'h-[44px] min-h-[44px] px-[18px]' : 'h-[34px]'
              )}
            >
              {t('connect_a_channel', 'Connect a channel')}
            </button>
          }
        />
      </div>
    );
  }

  const datePills = !!options.length && (
    <div className="flex shrink-0 items-center gap-[3px] rounded-pqSm bg-pqSettings p-[3px]">
      {options.map((option) => {
        const active = keys === option.key;
        const short =
          option.key === 7
            ? t('range_7d', '7d')
            : option.key === 30
            ? t('range_30d', '30d')
            : t('range_90d', '90d');
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => setKey(option.key)}
            className={clsx(
              'rounded-[8px] px-[15px] text-[13.5px] transition-colors',
              mobile ? 'h-[44px] min-h-[44px] flex-1' : 'h-[32px]',
              active
                ? 'bg-pqInner font-[600] text-pqText shadow-[inset_0_0_0_1px_var(--border)]'
                : 'font-[500] text-pqMuted hover:text-pqText'
            )}
          >
            {short}
          </button>
        );
      })}
    </div>
  );

  const analyticsBody = (
    <>
      {selected === ALL_CHANNELS && !!keys && (
        <WorkspaceAnalytics date={keys} />
      )}
      {selected !== ALL_CHANNELS && !!currentIntegration && !!keys && (
        <>
          <RenderAnalytics integration={currentIntegration} date={keys} />
          {currentIntegration.postAnalytics && (
            <WorkspaceAnalytics
              date={keys}
              integrationIds={currentIntegration.id}
            />
          )}
        </>
      )}
    </>
  );

  if (mobile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-pqInner">
        <div className="flex shrink-0 flex-col gap-[10px] border-b border-pqLine px-[14px] py-[12px]">
          <button
            type="button"
            onClick={() => setChannelSheetOpen(true)}
            className="flex min-h-[44px] items-center gap-[10px] rounded-pqSm bg-pqSettings px-[10px] text-start"
          >
            {selected === ALL_CHANNELS ? (
              <AllChannelsMosaic integrations={sortedIntegrations} />
            ) : (
              <span className="relative h-[32px] w-[32px] shrink-0">
                <ImageWithFallback
                  fallbackSrc={`/icons/platforms/${currentIntegration?.identifier}.png`}
                  src={currentIntegration?.picture || '/no-picture.jpg'}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                {currentIntegration && (
                  <img
                    src={`/icons/platforms/${currentIntegration.identifier}.png`}
                    alt=""
                    className="absolute -bottom-[2px] -end-[2px] h-[15px] w-[15px] rounded-full border border-pqInner"
                  />
                )}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-[600] text-pqText">
                {selected === ALL_CHANNELS
                  ? t('all_channels', 'All channels')
                  : currentIntegration?.name || t('analytics', 'Analytics')}
              </span>
              <span className="block truncate text-[12px] text-pqMuted">
                {t('choose_channel', 'Choose channel')}
              </span>
            </span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" className="shrink-0 text-pqSoft">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {datePills}
        </div>
        <div
          ref={paneRef}
          className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-[14px] py-[16px] pb-[48px]"
        >
          {analyticsBody}
        </div>
        <MobileSheet
          open={channelSheetOpen}
          onClose={() => setChannelSheetOpen(false)}
          title={t('channels', 'Channels')}
        >
          <div className="flex flex-col gap-[6px] pb-[8px]">
            <button
              type="button"
              onClick={openAddChannel}
              className="flex h-[44px] items-center justify-center gap-[7px] rounded-[9px] bg-pqSettings text-[12.5px] font-[600] text-pqText"
            >
              {t('add_channel', 'Add Channel')}
            </button>
            {sortedIntegrations.length > 1 && (
              <button
                type="button"
                onClick={() => selectChannel(ALL_CHANNELS)}
                className={clsx(
                  'flex min-h-[44px] items-center gap-[10px] rounded-pqSm px-[9px] py-[10px] text-start',
                  selected === ALL_CHANNELS ? 'bg-pqNavActive' : 'hover:bg-pqHover'
                )}
              >
                <AllChannelsMosaic integrations={sortedIntegrations} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px]">
                    {t('all_channels', 'All channels')}
                  </span>
                  <span className="block truncate text-[12px] text-pqMuted">
                    {t('n_channels', '{count} channels').replace(
                      '{count}',
                      String(sortedIntegrations.length)
                    )}
                  </span>
                </span>
              </button>
            )}
            {sortedIntegrations.map((integration) => {
              const isSelected = currentIntegration?.id === integration.id;
              const needsRefresh =
                !!integration.refreshNeeded || !!integration.inBetweenSteps;
              return (
                <button
                  key={integration.id}
                  type="button"
                  onClick={() => {
                    if (integration.refreshNeeded) {
                      toaster.show(
                        'Please refresh the integration from the calendar',
                        'warning'
                      );
                      return;
                    }
                    selectChannel(integration.id);
                  }}
                  className={clsx(
                    'flex items-center gap-[10px] rounded-pqSm px-[9px] py-[10px] text-start',
                    isSelected ? 'bg-pqNavActive' : 'hover:bg-pqHover'
                  )}
                >
                  <span className="relative h-[32px] w-[32px] shrink-0">
                    <ImageWithFallback
                      fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                      src={integration.picture || '/no-picture.jpg'}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                    <img
                      src={`/icons/platforms/${integration.identifier}.png`}
                      alt=""
                      className="absolute -bottom-[2px] -end-[2px] h-[15px] w-[15px] rounded-full border border-pqInner"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px]">
                      {integration.name}
                    </span>
                    <span
                      className={clsx(
                        'block truncate text-[12px]',
                        needsRefresh ? 'text-pqWarn' : 'text-pqMuted'
                      )}
                    >
                      {needsRefresh
                        ? t('needs_reconnect', 'Needs reconnect')
                        : channelListSubtitle(integration)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </MobileSheet>
      </div>
    );
  }

  return (
    <div
      ref={rowRef}
      className="relative flex min-h-0 flex-1 gap-[1px] bg-pqLine"
    >
      <div
        data-pq="analytics-channel-col"
        data-cr="1"
        className={clsx(
          'trz relative flex shrink-0 flex-col bg-pqInner transition-all',
          mobile
            ? 'w-full max-w-full'
            : channelsCollapsed
            ? 'group sidebar w-[100px] flex-[0_0_100px]'
            : 'w-[260px] flex-[0_0_260px]'
        )}
      >
        <div className="absolute inset-0 flex flex-col">
          <div className="flex shrink-0 items-center gap-[8px] border-b border-pqLine p-[16px_14px_12px]">
            <div
              data-crl="1"
              className="flex min-w-0 flex-1 items-baseline gap-[7px] group-[.sidebar]:hidden"
            >
              <span className="whitespace-nowrap text-[12px] font-[600] uppercase tracking-[0.06em] text-pqMuted">
                {t('channels', 'Channels')}
              </span>
              <span className="text-[11px] font-[600] text-pqSoft opacity-75">
                {sortedIntegrations.length}
              </span>
            </div>
            <button
              type="button"
              data-tooltip-id="tooltip"
              data-tooltip-content={
                channelsCollapsed
                  ? t('show_channels', 'Show channels')
                  : t('hide_channels', 'Hide channels')
              }
              onClick={toggleCollapse}
              aria-label={
                channelsCollapsed
                  ? t('show_channels', 'Show channels')
                  : t('hide_channels', 'Hide channels')
              }
              className={clsx(
                'grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText group-[.sidebar]:mx-auto group-[.sidebar]:rotate-180',
                mobile && 'hidden'
              )}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                <path
                  d="M14 8l-4 4 4 4"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 4.5v15"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div
            className={clsx(
              'flex shrink-0 items-center gap-[7px] p-[12px_12px_10px]',
              channelsCollapsed ? 'flex-col' : 'flex-row'
            )}
          >
            <button
              type="button"
              data-pq="analytics-add-channel"
              {...(channelsCollapsed && {
                'data-tooltip-id': 'tooltip',
                'data-tooltip-content': t('add_channel', 'Add Channel'),
                'aria-label': t('add_channel', 'Add Channel'),
              })}
              onClick={openAddChannel}
              className={clsx(
                'flex items-center justify-center gap-[7px] rounded-[9px] bg-pqSettings text-[12.5px] font-[600] text-pqText transition-colors hover:bg-pqBrandSoft',
                touch
                  ? 'h-[44px] min-h-[44px] min-w-0 flex-1'
                  : channelsCollapsed
                    ? 'h-[36px] w-[36px] shrink-0'
                    : 'h-[36px] min-w-0 flex-1'
              )}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                className="shrink-0"
              >
                <path
                  d="M12 5.5v13M5.5 12h13"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                />
              </svg>
              <span
                data-crl="1"
                className="whitespace-nowrap group-[.sidebar]:hidden"
              >
                {t('add_channel', 'Add Channel')}
              </span>
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-[2px] overflow-y-auto overflow-x-hidden px-[8px] pb-[12px]">
            {sortedIntegrations.length > 1 && (
              <div
                onClick={() => {
                  selectChannel(ALL_CHANNELS);
                }}
                className={clsx(
                  'relative flex min-h-[44px] cursor-pointer items-center gap-[10px] rounded-pqSm py-[7px] ps-[9px] pe-[6px] text-start transition-colors group-[.sidebar]:min-h-0 group-[.sidebar]:justify-center group-[.sidebar]:px-0',
                  selected === ALL_CHANNELS ? 'bg-pqNavActive' : 'hover:bg-pqHover'
                )}
              >
                <AllChannelsMosaic integrations={sortedIntegrations} />
                <span
                  data-crl="1"
                  className="min-w-0 flex-1 group-[.sidebar]:hidden"
                >
                  <span className="block truncate text-[14px]">
                    {t('all_channels', 'All channels')}
                  </span>
                  <span className="block truncate text-[12px] text-pqMuted">
                    {t('n_channels', '{count} channels').replace(
                      '{count}',
                      String(sortedIntegrations.length)
                    )}
                  </span>
                </span>
              </div>
            )}
            {sortedIntegrations.map((integration) => {
              const isSelected = currentIntegration?.id === integration.id;
              const needsRefresh =
                !!integration.refreshNeeded || !!integration.inBetweenSteps;
              return (
                <div
                  key={integration.id}
                  title={channelNameWithHandle(integration)}
                  onClick={() => {
                    if (integration.refreshNeeded) {
                      toaster.show(
                        'Please refresh the integration from the calendar',
                        'warning'
                      );
                      return;
                    }
                    setSelected(integration.id);
                    setDetailOpen(true);
                    setChannelSheetOpen(false);
                  }}
                  className={clsx(
                    'relative flex cursor-pointer items-center gap-[10px] rounded-pqSm py-[7px] ps-[9px] pe-[6px] text-start transition-colors group-[.sidebar]:justify-center group-[.sidebar]:px-0',
                    isSelected ? 'bg-pqNavActive' : 'hover:bg-pqHover'
                  )}
                >
                  <span className="relative h-[32px] w-[32px] shrink-0">
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
                    {needsRefresh && (
                      <span className="absolute -start-[2px] -top-[2px] flex h-[15px] w-[15px] items-center justify-center rounded-full bg-pqWarn text-[10px] font-[700] text-pqOnBrand">
                        !
                      </span>
                    )}
                  </span>
                  <span
                    data-crl="1"
                    className="min-w-0 flex-1 group-[.sidebar]:hidden"
                  >
                    <span className="block truncate text-[14px]">
                      {integration.name}
                    </span>
                    <span
                      className={clsx(
                        'block truncate text-[12px]',
                        needsRefresh ? 'text-pqWarn' : 'text-pqMuted'
                      )}
                    >
                      {needsRefresh
                        ? t('needs_reconnect', 'Needs reconnect')
                        : channelListSubtitle(integration)}
                    </span>
                  </span>
                  <div
                    data-crl="1"
                    className="shrink-0 group-[.sidebar]:hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Menu
                      id={integration.id}
                      canEnable={!!integration.disabled}
                      canDisable={!integration.disabled}
                      canChangeProfilePicture={
                        !!integration.changeProfilePicture
                      }
                      canChangeNickName={!!integration.changeNickName}
                      refreshChannel={refreshChannel}
                      mutate={() => {
                        void mutate();
                      }}
                      onChange={onMenuChange}
                      integrations={sortedIntegrations}
                      reloadCalendarView={() => {
                        void mutate();
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <TwoColumnDetailDrawer
        open={detailOpen}
        onClose={closeDetail}
        label={
          selected === ALL_CHANNELS
            ? t('all_channels', 'All channels')
            : currentIntegration?.name || t('analytics', 'Analytics')
        }
        anchorRef={rowRef}
        scrollResetKey={selected}
        className="gap-[18px] bg-pqInner px-[26px] pb-[48px] pt-[22px]"
      >
        {selected === ALL_CHANNELS && !!options.length && (
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-[18px]">
            <div className="flex flex-wrap items-center gap-[12px]">
              <div className="min-w-0">
                <div className="truncate font-display text-[20px] font-[600] -tracking-[0.02em] text-pqText">
                  {t('all_channels', 'All channels')}
                </div>
                <div className="mt-[3px] text-[14px] text-pqMuted">
                  {t(
                    'analytics_lifetime_totals_hint',
                    'Posts published in this period · current totals'
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1" />
              <div className="flex shrink-0 items-center gap-[3px] rounded-pqSm bg-pqSettings p-[3px]">
                {options.map((option) => {
                  const active = keys === option.key;
                  const short =
                    option.key === 7
                      ? t('range_7d', '7d')
                      : option.key === 30
                      ? t('range_30d', '30d')
                      : t('range_90d', '90d');
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setKey(option.key)}
                      className={clsx(
                        'h-[32px] rounded-[8px] px-[15px] text-[13.5px] transition-colors',
                        active
                          ? 'bg-pqInner font-[600] text-pqText shadow-[inset_0_0_0_1px_var(--border)]'
                          : 'font-[500] text-pqMuted hover:text-pqText'
                      )}
                    >
                      {short}
                    </button>
                  );
                })}
              </div>
            </div>
            {!!keys && (
              <WorkspaceAnalytics date={keys} />
            )}
          </div>
        )}
        {selected !== ALL_CHANNELS && !!currentIntegration && !!options.length && (
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-[18px]">
            <div className="flex flex-wrap items-center gap-[12px]">
              <span className="relative size-[44px] shrink-0">
                <ImageWithFallback
                  fallbackSrc={`/icons/platforms/${currentIntegration.identifier}.png`}
                  src={currentIntegration.picture || '/no-picture.jpg'}
                  alt=""
                  width={44}
                  height={44}
                  className="size-[44px] rounded-full object-cover"
                />
                <img
                  src={`/icons/platforms/${currentIntegration.identifier}.png`}
                  alt=""
                  className="absolute -bottom-[3px] -end-[3px] size-[19px] rounded-full border border-pqInner object-cover"
                />
              </span>
              <div className="min-w-0">
                <div className="truncate font-display text-[20px] font-[600] -tracking-[0.02em] text-pqText">
                  {currentIntegration.name}
                </div>
                <div className="mt-[3px] text-[14px] text-pqMuted">
                  {t('analytics_summary_range', '{meta} · last {days} days')
                    .replace(
                      '{meta}',
                      channelListSubtitle(currentIntegration)
                    )
                    .replace('{days}', String(keys))}
                </div>
              </div>
              <div className="min-w-0 flex-1" />
              <div className="flex shrink-0 items-center gap-[3px] rounded-pqSm bg-pqSettings p-[3px]">
                {options.map((option) => {
                  const active = keys === option.key;
                  const short =
                    option.key === 7
                      ? t('range_7d', '7d')
                      : option.key === 30
                      ? t('range_30d', '30d')
                      : t('range_90d', '90d');
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setKey(option.key)}
                      className={clsx(
                        'h-[32px] rounded-[8px] px-[15px] text-[13.5px] transition-colors',
                        active
                          ? 'bg-pqInner font-[600] text-pqText shadow-[inset_0_0_0_1px_var(--border)]'
                          : 'font-[500] text-pqMuted hover:text-pqText'
                      )}
                    >
                      {short}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* No remount nonce. The channel and the range are both already in
                `RenderAnalytics`'s SWR key and both already props, so React
                re-renders and SWR re-keys on its own. Unmounting it dropped the
                subscription, forced a refetch of warm keys, and guaranteed the
                ghost painted — it caused the flash it looked like it avoided. */}
            {!!keys && (
              <>
                <RenderAnalytics integration={currentIntegration} date={keys} />
                {currentIntegration.postAnalytics && (
                  <WorkspaceAnalytics
                    date={keys}
                    integrationIds={currentIntegration.id}
                  />
                )}
              </>
            )}
          </div>
        )}
      </TwoColumnDetailDrawer>
    </div>
  );
};
