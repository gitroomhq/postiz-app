'use client';

import useSWR from 'swr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sortIntegrationsByProviderImportance } from '@gitroom/frontend/components/launches/helpers/sort.integrations';
import clsx from 'clsx';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { RenderAnalytics } from '@gitroom/frontend/components/platform-analytics/render.analytics';
import { useRouter } from 'next/navigation';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import useCookie from 'react-use-cookie';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import { TwoColumnDetailDrawer } from '@gitroom/frontend/components/layout/two-column-detail-drawer';
import { Menu } from '@gitroom/frontend/components/launches/menu/menu';
import { Integration } from '@prisma/client';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';

const allowedIntegrations = [
  'facebook',
  'instagram',
  'instagram-standalone',
  'linkedin-page',
  'tiktok',
  'youtube',
  'gmb',
  'pinterest',
  'threads',
  'x',
];

export const PlatformAnalytics = () => {
  const fetch = useFetch();
  const t = useT();
  const router = useRouter();
  const { disableXAnalytics } = useVariables();
  const { mobile, tablet } = useViewport();

  const [selected, setSelected] = useState('');
  const [key, setKey] = useState(7);
  const [refresh, setRefresh] = useState(false);
  const [collapseMenu, setCollapseMenu] = useCookie('collapseMenu', '0');
  const channelsCollapsed = !mobile && collapseMenu === '1';
  const autoCollapsed = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);
  // Phone: list full-bleed; detail is a drawer. Auto-select must not open it.
  const [detailOpen, setDetailOpen] = useState(false);
  const toaster = useToaster();

  const closeDetail = useCallback(() => setDetailOpen(false), []);

  const load = useCallback(async () => {
    const int = (
      await (await fetch('/integrations/list')).json()
    ).integrations.filter((f: any) => {
      if (f.identifier === 'x' && disableXAnalytics) {
        return false;
      }
      return true;
    });
    return int.filter((f: any) => allowedIntegrations.includes(f.identifier));
  }, [fetch, disableXAnalytics]);

  const { data, isLoading, mutate } = useSWR('analytics-list', load, {
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
      }
    >;
  }, [data]);

  // Auto-select first analytics channel when none (or stale id) is selected.
  useEffect(() => {
    if (!sortedIntegrations.length) return;
    const stillThere = sortedIntegrations.some((i) => i.id === selected);
    if (!selected || !stillThere) {
      setSelected(sortedIntegrations[0].id);
    }
  }, [sortedIntegrations, selected]);

  const currentIntegration = useMemo(() => {
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
        if (!fresh.some((d: { id: string }) => d.id === selected)) {
          setSelected(fresh[0]?.id || '');
        }
      });
    },
    [mutate, selected]
  );

  const options = useMemo(() => {
    if (!currentIntegration) {
      return [];
    }
    const arr = [];
    if (
      [
        'facebook',
        'instagram',
        'instagram-standalone',
        'linkedin-page',
        'pinterest',
        'youtube',
        'threads',
        'gmb',
        'x',
        'tiktok',
      ].indexOf(currentIntegration.identifier) !== -1
    ) {
      arr.push({
        key: 7,
        value: t('7_days', '7 Days'),
      });
    }
    if (
      [
        'facebook',
        'instagram',
        'instagram-standalone',
        'linkedin-page',
        'pinterest',
        'youtube',
        'threads',
        'gmb',
        'x',
        'tiktok',
      ].indexOf(currentIntegration.identifier) !== -1
    ) {
      arr.push({
        key: 30,
        value: t('30_days', '30 Days'),
      });
    }
    if (
      ['facebook', 'linkedin-page', 'pinterest', 'youtube', 'x', 'gmb'].indexOf(
        currentIntegration.identifier
      ) !== -1
    ) {
      arr.push({
        key: 90,
        value: t('90_days', '90 Days'),
      });
    }
    return arr;
  }, [currentIntegration, t]);

  const keys = useMemo(() => {
    if (!currentIntegration) {
      return 7;
    }
    if (options.find((p) => p.key === key)) {
      return key;
    }
    return options[0]?.key;
  }, [key, currentIntegration, options]);

  if (isLoading) {
    return (
      <div className="bg-pqInner p-[20px] flex flex-1 flex-col gap-[15px] transition-all items-center justify-center">
        <LoadingComponent />
      </div>
    );
  }

  if (!sortedIntegrations.length && !isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-pqInner px-[26px] py-[70px] text-center">
        <span className="mb-[12px] grid h-[46px] w-[46px] place-items-center rounded-[14px] bg-pqSettings text-pqSoft">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <path
              d="M4 19.5V4.5M4 19.5h16M8 16v-4M12.5 16V8M17 16v-6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="max-w-[420px] text-center">
          <div className="text-[16px] font-[600] text-pqText">
            {t('no_analytics_yet', 'No analytics yet')}
          </div>
          <div className="mt-[6px] text-[13px] leading-[1.6] text-pqMuted">
            {t(
              'analytics_empty_connect_hint',
              'Connect a social channel to start collecting impressions, engagement and follower data. Supported: X, Instagram, LinkedIn Page, Facebook, TikTok, YouTube, Threads, Pinterest, GMB.'
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={openAddChannel}
          className="mt-[12px] h-[34px] rounded-pqSm bg-pqBrand px-[14px] text-[13px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover"
        >
          {t('connect_a_channel', 'Connect a channel')}
        </button>
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
                'flex h-[36px] items-center justify-center gap-[7px] rounded-[9px] bg-pqSettings text-[12.5px] font-[600] text-pqText transition-colors hover:bg-pqBrandSoft',
                channelsCollapsed ? 'w-[36px] shrink-0' : 'min-w-0 flex-1'
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
            {sortedIntegrations.map((integration) => {
              const isSelected = currentIntegration?.id === integration.id;
              const needsRefresh =
                !!integration.refreshNeeded || !!integration.inBetweenSteps;
              return (
                <div
                  key={integration.id}
                  title={integration.name}
                  onClick={() => {
                    if (integration.refreshNeeded) {
                      toaster.show(
                        'Please refresh the integration from the calendar',
                        'warning'
                      );
                      return;
                    }
                    setRefresh(true);
                    setTimeout(() => {
                      setRefresh(false);
                    }, 10);
                    setSelected(integration.id);
                    setDetailOpen(true);
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
                        : integration.identifier}
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
        label={currentIntegration?.name || t('analytics', 'Analytics')}
        anchorRef={rowRef}
        className="gap-[18px] bg-pqInner px-[26px] pb-[48px] pt-[22px]"
      >
        {!!currentIntegration && !!options.length && (
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-[18px]">
            <div className="flex flex-wrap items-center gap-[12px]">
              <span className="relative size-[44px] shrink-0">
                <ImageWithFallback
                  fallbackSrc={`/icons/platforms/${currentIntegration.identifier}.png`}
                  src={currentIntegration.picture || '/no-picture.jpg'}
                  alt=""
                  width={44}
                  height={44}
                  className="size-[44px] rounded-[13px] object-cover"
                />
                <span
                  className="absolute -bottom-[3px] -end-[3px] size-[19px] rounded-full bg-[length:13px] bg-center bg-no-repeat"
                  style={{
                    backgroundColor: 'var(--badgeRing)',
                    backgroundImage: `url(/icons/platforms/${currentIntegration.identifier}.png)`,
                  }}
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
                      `@${String(currentIntegration.name || currentIntegration.identifier).replace(/^@/, '')}`
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
                      onClick={() => {
                        setRefresh(true);
                        setKey(option.key);
                        setTimeout(() => setRefresh(false), 0);
                      }}
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
            {!!keys && !refresh && (
              <RenderAnalytics integration={currentIntegration} date={keys} />
            )}
          </div>
        )}
      </TwoColumnDetailDrawer>
    </div>
  );
};
