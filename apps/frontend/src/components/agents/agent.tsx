'use client';

import React, {
  createContext,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import clsx from 'clsx';
import useCookie from 'react-use-cookie';
import useSWR from 'swr';
import { sortIntegrationsByProviderImportance } from '@gitroom/frontend/components/launches/helpers/sort.integrations';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { MultiMediaComponent } from '@gitroom/frontend/components/media/media.component';
import { Menu } from '@gitroom/frontend/components/launches/menu/menu';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { Integration } from '@prisma/client';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { TrialLockCard } from '@gitroom/frontend/components/billing/trial-lock-card';

const needsAttention = (integration: {
  refreshNeeded?: boolean;
  inBetweenSteps?: boolean;
}) => !!(integration.refreshNeeded || integration.inBetweenSteps);

export const MediaPortal: FC<{
  media: { path: string; id: string }[];
  value: string;
  // Thumbs sit above the textarea; toolbar buttons stay in the controls row.
  part?: 'thumbs' | 'toolbar';
  setMedia: (event: {
    target: {
      name: string;
      value?: {
        id: string;
        path: string;
        alt?: string;
        thumbnail?: string;
        thumbnailTimestamp?: number;
      }[];
    };
  }) => void;
}> = ({ media, setMedia, value, part = 'toolbar' }) => {
  // Rendered inside the composer frame (agent.input.tsx / UnconfiguredAgentShell).
  // Do not gate on CopilotKit's `.copilotKitMessages` — that class is only on
  // the live SDK tree; waiting for it hid Insert media / Design / AI when the
  // unconfigured shell was shown (and could race on mount).
  return (
    <MultiMediaComponent
      ghost={true}
      ghostPart={part}
      allData={[{ content: value }]}
      text={value}
      label=""
      description=""
      value={media}
      dummy={false}
      name="image"
      onChange={setMedia}
      onOpen={() => {}}
      onClose={() => {}}
    />
  );
};

export const AgentList: FC<{
  onChange: (arr: any[]) => void;
  /** Bumped when the composer empty CTA asks to focus this column. */
  expandNonce?: number;
  /** Channel ⋮ menu — same Menu as Channels; stopPropagation keeps row select. */
  showKebab?: boolean;
}> = ({ onChange, expandNonce = 0, showKebab = true }) => {
  const fetch = useFetch();
  const t = useT();
  const toast = useToaster();
  const router = useRouter();
  const [selected, setSelected] = useState([]);
  const colRef = useRef<HTMLDivElement>(null);

  const { mobile, tablet } = useViewport();
  const [collapseMenu, setCollapseMenu] = useCookie('collapseMenu', '0');
  // Below 760 this column lives in a drawer (see `Agent`), where it gets the
  // full 264px and should be the expanded list, not the icon rail. The rail is
  // only for the desktop collapse toggle.
  const channelsCollapsed = !mobile && collapseMenu === '1';
  const autoCollapsed = useRef(false);

  // Design `_autoSide`: collapse under 1180 on viewport transitions only.
  // `collapseMenu` must stay out of the deps — otherwise expanding on tablet
  // immediately re-fires this and forces the rail shut again.
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

  useEffect(() => {
    if (!expandNonce) return;
    if (collapseMenu === '1') {
      autoCollapsed.current = false;
      setCollapseMenu('0', { days: 365 });
    }
    colRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [expandNonce, collapseMenu, setCollapseMenu]);

  // Shared `/integrations/list` cache (array shape). Do not use the bare
  // `'integrations'` key — webhooks/autopost historically cached `{ integrations }`.
  const { data, mutate } = useIntegrationList();

  const openAddChannel = useCallback(() => {
    router.push('/channels?add=1');
  }, [router]);

  const pruneSelected = useCallback(
    (
      prev: Integrations[],
      fresh: Array<
        Integrations & {
          refreshNeeded?: boolean;
          inBetweenSteps?: boolean;
        }
      >
    ) => {
      const next = prev.filter((p) => {
        const row = fresh.find((d) => d.id === p.id);
        return row && !needsAttention(row);
      });
      if (next.length !== prev.length) {
        onChange(next);
      }
      return next;
    },
    [onChange]
  );

  const setIntegration = useCallback(
    (integration: Integrations) => () => {
      if (selected.some((p) => p.id === integration.id)) {
        onChange(selected.filter((p) => p.id !== integration.id));
        setSelected(selected.filter((p) => p.id !== integration.id));
        return;
      }
      if (needsAttention(integration)) {
        toast.show(
          t(
            'channel_disconnected_click_to_reconnect',
            'Channel disconnected, click to reconnect.'
          ),
          'warning'
        );
        return;
      }
      onChange([...selected, integration]);
      setSelected([...selected, integration]);
    },
    [selected, onChange, toast, t]
  );

  const sortedIntegrations = useMemo(() => {
    return sortIntegrationsByProviderImportance(data || []) as Array<
      Integrations & {
        refreshNeeded?: boolean;
        internalId?: string;
      }
    >;
  }, [data]);

  // Same OAuth reconnect the Channels page uses — Menu needs a factory that
  // returns the click handler for the row's integration.
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
        })();
      },
    [fetch, t, toast]
  );

  useEffect(() => {
    if (!data?.length) return;
    setSelected((prev) => pruneSelected(prev, data));
  }, [data, pruneSelected]);

  const onMenuChange = useCallback(
    (shouldReload: boolean) => {
      void mutate().then((fresh) => {
        if (!shouldReload || !fresh) return;
        setSelected((prev) => pruneSelected(prev, fresh));
      });
    },
    [mutate, pruneSelected]
  );

  return (
    <div
      ref={colRef}
      data-pq="agent-channel-col"
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
              {t('select_channels', 'Select Channels')}
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
            data-pq="agent-add-channel"
            {...(channelsCollapsed && {
              'data-tooltip-id': 'tooltip',
              'data-tooltip-content': t('add_channel', 'Add Channel'),
              'aria-label': t('add_channel', 'Add Channel'),
            })}
            onClick={openAddChannel}
            className={clsx(
              'flex h-[36px] items-center justify-center gap-[7px] rounded-[9px] text-[12.5px] font-[600] transition-colors',
              channelsCollapsed ? 'w-[36px] shrink-0' : 'min-w-0 flex-1',
              !sortedIntegrations.length
                ? 'bg-pqBrand text-pqOnBrand shadow-[0_6px_18px_-8px_rgba(124,58,237,.9)] hover:bg-pqBrandHover'
                : 'bg-pqSettings text-pqText hover:bg-pqBrandSoft'
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
            const blocked = needsAttention(integration);
            const isSelected =
              !blocked && selected.some((p) => p.id === integration.id);
            return (
              <div
                onClick={setIntegration(integration)}
                key={integration.id}
                title={integration.name}
                className={clsx(
                  'relative flex items-center gap-[10px] rounded-pqSm py-[7px] ps-[9px] pe-[6px] text-start transition-colors group-[.sidebar]:justify-center group-[.sidebar]:px-0',
                  blocked
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer',
                  isSelected
                    ? 'bg-pqBrandSoft'
                    : !blocked && 'opacity-60 hover:bg-pqHover hover:opacity-100'
                )}
              >
                <span className="relative h-[32px] w-[32px] shrink-0">
                  {isSelected && (
                    <span className="absolute -start-[4px] -top-[4px] z-[2] flex h-[16px] w-[16px] items-center justify-center rounded-full bg-pqBrand text-pqOnBrand">
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none">
                        <path
                          d="M5 12.5l4.5 4.5L19 7.5"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                  <ImageWithFallback
                    fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                    src={integration.picture || '/no-picture.jpg'}
                    className="rounded-full"
                    alt={integration.identifier}
                    width={32}
                    height={32}
                  />
                  <img
                    src={`/icons/platforms/${integration.identifier}.png`}
                    alt=""
                    className="absolute -bottom-[2px] -end-[2px] h-[15px] w-[15px] rounded-full border border-pqInner"
                  />
                  {(integration.inBetweenSteps ||
                    integration.refreshNeeded) && (
                    <span className="absolute -start-[2px] -top-[2px] z-[3] flex h-[15px] w-[15px] items-center justify-center rounded-full bg-pqWarn text-[10px] font-[700] text-pqOnBrand">
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
                      integration.refreshNeeded || integration.inBetweenSteps
                        ? 'text-pqWarn'
                        : 'text-pqMuted'
                    )}
                  >
                    {integration.refreshNeeded || integration.inBetweenSteps
                      ? t('needs_reconnect', 'Needs reconnect')
                      : integration.identifier}
                  </span>
                </span>
                {showKebab && (
                  <div
                    data-crl="1"
                    className="shrink-0 group-[.sidebar]:hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Menu
                      id={integration.id}
                      canEnable={!!integration.disabled}
                      canDisable={!integration.disabled}
                      canChangeProfilePicture={!!integration.changeProfilePicture}
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const PropertiesContext = createContext<{
  properties: any[];
  openChannels: () => void;
}>({ properties: [], openChannels: () => {} });
export const Agent: FC<{ children: ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState([]);
  const t = useT();
  const user = useUser();
  const { mobile } = useViewport();
  const rowRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<'channels' | 'threads' | null>(null);
  const [drawerTop, setDrawerTop] = useState(0);
  const [channelExpandNonce, setChannelExpandNonce] = useState(0);
  // Design: Copilot waits until the trial ends (or the person ends it early).
  // Lock-until-paid also blocks when deferred founding $49 is still owed.
  const trialLocked =
    !!user?.isTrailing || !!user?.lifetimePaymentPending;

  // Below 760 both side columns leave the chat about 200px — two or three
  // words a line, and a message box the shape of a bookmark. They become
  // off-canvas drawers instead, the same move the rail makes, so the chat gets
  // the full width. The design does this from a header button; here the two
  // toggles sit above the chat, because the header slot already carries the
  // page action.
  const asDrawer = mobile;

  useEffect(() => {
    if (!asDrawer) {
      setPanel(null);
      return;
    }
    // The drawers open *below* the app chrome rather than over it, so their top
    // is measured rather than assumed — same reason as in `rail.tsx`.
    const measure = () =>
      setDrawerTop(
        Math.max(0, rowRef.current?.getBoundingClientRect().top ?? 0)
      );
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [asDrawer]);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  const toggle = (which: 'channels' | 'threads', label: string) => (
    <button
      type="button"
      data-pq={`agent-${which}`}
      onClick={() => setPanel((p) => (p === which ? null : which))}
      aria-expanded={panel === which}
      className="h-[32px] rounded-pqSm border border-pqBorder bg-pqInner px-[12px] text-[12.5px] font-[500] text-pqText"
    >
      {label}
    </button>
  );

  const openChannels = useCallback(() => {
    if (asDrawer) {
      setPanel('channels');
      return;
    }
    setChannelExpandNonce((n) => n + 1);
  }, [asDrawer]);

  return (
    <PropertiesContext.Provider value={{ properties, openChannels }}>
      <div ref={rowRef} className="relative flex min-w-0 flex-1">
        {asDrawer && panel && (
          <div
            onClick={() => setPanel(null)}
            style={{ top: drawerTop }}
            className="fixed inset-x-0 bottom-0 z-[72] bg-pqPopup"
          />
        )}
        <AgentDrawer
          active={asDrawer}
          open={panel === 'channels'}
          side="start"
          top={drawerTop}
          label={t('select_channels', 'Select Channels')}
        >
          <AgentList
            onChange={setProperties}
            expandNonce={channelExpandNonce}
            showKebab
          />
        </AgentDrawer>

        {/* Trial lock covers the chat column only — Select Channels stays
            interactive (design keeps the channel list outside the AI lock). */}
        <div
          className={clsx(
            'bg-pqInner relative flex flex-1 flex-col min-w-0',
            // The hairline between the chat and the rail belongs to the
            // desktop layout — in drawer mode the rail is off-canvas.
            !asDrawer && 'border-e border-pqLine'
          )}
        >
          {trialLocked && (
            <TrialLockCard
              variant="overlay"
              name={t('ai_copilot', 'AI Copilot')}
              title={t(
                'ai_copilot_unlocks_after_your_trial',
                'AI Copilot unlocks after your trial'
              )}
              description={t(
                'ai_lock_sub',
                'Your channels, calendar and analytics are already live. Copilot is the one thing that waits for your first payment.'
              )}
              perks={[
                t(
                  'ai_lock_perk_chat',
                  'Copilot chat that drafts and schedules for you'
                ),
                t('ai_lock_perk_images', '300 AI images a month'),
                t('ai_lock_perk_videos', '30 AI videos a month'),
              ]}
            />
          )}
          {asDrawer && (
            <div className="flex shrink-0 items-center gap-[8px] border-b border-pqLine px-[12px] py-[8px]">
              {toggle('channels', t('select_channels', 'Select Channels'))}
              {toggle('threads', t('conversations', 'Conversations'))}
            </div>
          )}
          <div className="flex flex-1 min-w-0">{children}</div>
        </div>

        <AgentDrawer
          active={asDrawer}
          open={panel === 'threads'}
          side="end"
          top={drawerTop}
          label={t('conversations', 'Conversations')}
        >
          <Threads />
        </AgentDrawer>
      </div>
    </PropertiesContext.Provider>
  );
};

/**
 * Off-canvas wrapper for one of the agent page's side columns. Inactive it is
 * a passthrough, so the desktop layout is byte-identical to before. Active, it
 * clips the parked drawer — a panel parked a full width outside the viewport
 * widens the page in RTL otherwise, which is the bug `rail.tsx` hit.
 */
const AgentDrawer: FC<{
  active: boolean;
  open: boolean;
  side: 'start' | 'end';
  top: number;
  label: string;
  children: ReactNode;
}> = ({ active, open, side, top, label, children }) => {
  if (!active) return <>{children}</>;
  return (
    <div
      style={{ top }}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[78] overflow-hidden"
    >
      <div
        {...(open ? { role: 'dialog', 'aria-modal': true } : {})}
        aria-label={label}
        aria-hidden={!open}
        className={clsx(
          'pointer-events-auto absolute inset-y-0 flex w-[264px] shadow-pqE3 transition-transform duration-200 ease-out',
          side === 'start'
            ? clsx('start-0', !open && '-translate-x-[104%] rtl:translate-x-[104%]')
            : clsx('end-0', !open && 'translate-x-[104%] rtl:-translate-x-[104%]')
        )}
      >
        {children}
      </div>
    </div>
  );
};

const Threads: FC = () => {
  const fetch = useFetch();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const threads = useCallback(async () => {
    return (await fetch('/copilot/list')).json();
  }, []);
  const { id } = useParams<{ id: string }>();

  const { data } = useSWR('threads', threads);
  const { mobile } = useViewport();
  const [collapseRail, setCollapseRail] = useCookie('agentRailCollapse', '0');
  // The pin toggle only means anything on desktop — in the mobile drawer
  // (see `Agent`) the rail fills the drawer and has no narrow state.
  const collapsed = !mobile && collapseRail === '1';

  return (
    // Below 760 this lives in a drawer (see `Agent`) and fills it. Two fixed
    // side columns beside the chat left it nothing at phone widths — the page
    // rendered with no usable conversation area at all, and did so before the
    // migration too.
    <div
      className={clsx(
        'trz bg-pqInner relative flex shrink-0 flex-col gap-[9px] overflow-y-auto p-[16px_12px] transition-[width]',
        mobile
          ? 'w-full'
          : clsx(
              'group/rail border-s border-pqLine',
              collapsed ? 'w-[56px] hover:w-[232px]' : 'w-[232px]'
            )
      )}
    >
      <div className="flex shrink-0 items-center gap-[6px] p-[0_2px_2px]">
        <div
          className={clsx(
            'min-w-0 flex-1 text-[10.5px] font-[600] uppercase tracking-[0.07em] text-pqSoft',
            collapsed && 'hidden group-hover/rail:block'
          )}
        >
          {t('chats', 'Chats')}
        </div>
        {!mobile && (
          <button
            type="button"
            data-tooltip-id="tooltip"
            data-tooltip-content={
              collapsed
                ? t('pin_chats', 'Pin chats')
                : t('unpin_chats', 'Unpin chats')
            }
            aria-label={
              collapsed
                ? t('pin_chats', 'Pin chats')
                : t('unpin_chats', 'Unpin chats')
            }
            onClick={() =>
              setCollapseRail(collapsed ? '0' : '1', { days: 365 })
            }
            className={clsx(
              'h-[26px] shrink-0 items-center gap-[6px] whitespace-nowrap rounded-[7px] px-[8px] text-[11.5px] font-[600] text-pqSoft hover:bg-pqHover hover:text-pqText',
              collapsed ? 'hidden group-hover/rail:flex' : 'flex'
            )}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              className="shrink-0"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="2.2"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path d="M14.5 4v16" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            {collapsed
              ? t('pin_chats', 'Pin chats')
              : t('unpin_chats', 'Unpin chats')}
          </button>
        )}
      </div>
      <Link
        href={`/agents`}
        {...(collapsed && {
          'data-tooltip-id': 'tooltip',
          'data-tooltip-content': t('new_chat', 'New chat'),
          'aria-label': t('new_chat', 'New chat'),
        })}
        className={clsx(
          'flex h-[34px] shrink-0 items-center justify-center gap-[7px] whitespace-nowrap rounded-pqSm bg-pqBrand text-[13px] font-[600] text-pqOnBrand outline-none transition-colors hover:bg-pqBrandHover',
          collapsed ? 'px-0 group-hover/rail:px-[12px]' : 'px-[12px]'
        )}
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
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
        <span className={clsx(collapsed && 'hidden group-hover/rail:inline')}>
          {t('new_chat', 'New chat')}
        </span>
      </Link>
      <div
        className={clsx(
          'flex flex-col gap-[1px]',
          collapsed && 'hidden group-hover/rail:flex'
        )}
      >
        {data?.threads?.map((p: any) => (
          <Link
            className={clsx(
              'overflow-hidden text-ellipsis whitespace-nowrap rounded-pqSm p-[7px_9px] text-[12.5px] hover:bg-pqHover hover:text-pqText',
              p.id === id ? 'bg-pqNavOn text-pqText' : 'text-pqMuted'
            )}
            href={`/agents/${p.id}`}
            key={p.id}
          >
            {p.title}
          </Link>
        ))}
      </div>
    </div>
  );
};
