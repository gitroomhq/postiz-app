'use client';

import useSWR from 'swr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { capitalize } from 'lodash';
import { sortIntegrationsByProviderImportance } from '@gitroom/frontend/components/launches/helpers/sort.integrations';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import clsx from 'clsx';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useRouter } from 'next/navigation';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { PlugsContext } from '@gitroom/frontend/components/plugs/plugs.context';
import { Plug } from '@gitroom/frontend/components/plugs/plug';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import useCookie from 'react-use-cookie';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import { TwoColumnDetailDrawer } from '@gitroom/frontend/components/layout/two-column-detail-drawer';

export const Plugs = () => {
  const fetch = useFetch();
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const toaster = useToaster();
  const { mobile, tablet } = useViewport();
  const [collapseMenu, setCollapseMenu] = useCookie('collapseMenu', '0');
  const channelsCollapsed = !mobile && collapseMenu === '1';
  const autoCollapsed = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);
  // Phone: list full-bleed; plug detail opens as a drawer on tap.
  const [detailOpen, setDetailOpen] = useState(false);
  const closeDetail = useCallback(() => setDetailOpen(false), []);

  const load2 = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, [fetch]);
  const { data: plugList, isLoading: plugLoading } = useSWR(
    '/integrations/plug/list',
    load2,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      revalidateOnMount: true,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
    }
  );
  // Do not share `analytics-list` — that key is filtered for analytics only.
  const { data, isLoading } = useIntegrationList();

  const t = useT();

  const openAddChannel = useCallback(() => {
    router.push('/channels?add=1');
  }, [router]);

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
    const list = Array.isArray(data) ? data : [];
    return sortIntegrationsByProviderImportance(
      list.filter((integration: any) =>
        plugList?.plugs?.some(
          (f: any) => f.identifier === integration.identifier
        )
      ) as any[]
    );
  }, [data, plugList]);
  const currentIntegration = useMemo(() => {
    return sortedIntegrations[current];
  }, [current, sortedIntegrations]);
  const currentIntegrationPlug = useMemo(() => {
    const plug = plugList?.plugs?.find(
      (f: any) => f?.identifier === currentIntegration?.identifier
    );
    if (!plug) {
      return null;
    }
    return {
      providerId: currentIntegration.id,
      ...plug,
    };
  }, [currentIntegration, plugList]);

  if (isLoading || plugLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-pqInner p-[20px]">
        <LoadingComponent />
      </div>
    );
  }

  if (!sortedIntegrations.length && !isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-pqInner px-[22px] py-[70px] text-center">
        <span className="mb-[11px] grid h-[46px] w-[46px] place-items-center rounded-[14px] bg-pqSettings text-pqSoft">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <path
              d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="max-w-[400px] text-center">
          <div className="text-[15px] font-[600] text-pqText">
            {t('no_plugs_for_these_channels', 'No plugs for these channels')}
          </div>
          <div className="mt-[6px] text-[13px] leading-[1.6] text-pqMuted">
            {t(
              'auto_plugs_supported_channels',
              'Auto-plugs work on X, LinkedIn Page, Threads and Bluesky. Connect one of those to start.'
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={openAddChannel}
          className="mt-[11px] h-[34px] rounded-pqSm bg-pqBrand px-[14px] text-[13px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover"
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
        data-pq="plugs-channel-col"
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
              data-pq="plugs-add-channel"
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
            {sortedIntegrations.map((integration, index) => {
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
                        t(
                          'channel_disconnected_click_to_reconnect',
                          'Channel disconnected, click to reconnect.'
                        ),
                        'warning'
                      );
                      return;
                    }
                    setCurrent(index);
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
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <TwoColumnDetailDrawer
        open={detailOpen}
        onClose={closeDetail}
        label={currentIntegration?.name || t('auto_plugs', 'Auto-Plugs')}
        anchorRef={rowRef}
        className="bg-pqInner px-[22px] pb-[40px] pt-[18px]"
      >
        <PlugsContext.Provider value={currentIntegrationPlug}>
          <Plug />
        </PlugsContext.Provider>
      </TwoColumnDetailDrawer>
    </div>
  );
};
