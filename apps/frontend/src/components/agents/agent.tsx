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
import { orderBy } from 'lodash';
import { useAddProvider } from '@gitroom/frontend/components/launches/add.provider.component';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useWaitForClass } from '@gitroom/helpers/utils/use.wait.for.class';
import { MultiMediaComponent } from '@gitroom/frontend/components/media/media.component';
import { Integration } from '@prisma/client';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';

export const MediaPortal: FC<{
  media: { path: string; id: string }[];
  value: string;
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
}> = ({ media, setMedia, value }) => {
  const waitForClass = useWaitForClass('copilotKitMessages');
  if (!waitForClass) return null;
  // Rendered inside the composer frame (agent.input.tsx), where the design
  // draws the media buttons as ghosts rather than the post composer's pills.
  return (
    <MultiMediaComponent
      ghost={true}
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

export const AgentList: FC<{ onChange: (arr: any[]) => void }> = ({
  onChange,
}) => {
  const fetch = useFetch();
  const t = useT();
  const [selected, setSelected] = useState([]);

  const load = useCallback(async () => {
    return (await (await fetch('/integrations/list')).json()).integrations;
  }, []);

  const { mobile } = useViewport();
  const [collapseMenu, setCollapseMenu] = useCookie('collapseMenu', '0');
  // Below 760 this column lives in a drawer (see `Agent`), where it gets the
  // full 264px and should be the expanded list, not the icon rail. The rail is
  // only for the desktop collapse toggle.
  const channelsCollapsed = !mobile && collapseMenu === '1';

  const { data, mutate } = useSWR('integrations', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });

  // The same add-channel dialog every other surface opens — not a copy.
  const addProvider = useAddProvider(() => mutate());

  const setIntegration = useCallback(
    (integration: Integration) => () => {
      if (selected.some((p) => p.id === integration.id)) {
        onChange(selected.filter((p) => p.id !== integration.id));
        setSelected(selected.filter((p) => p.id !== integration.id));
      } else {
        onChange([...selected, integration]);
        setSelected([...selected, integration]);
      }
    },
    [selected]
  );

  const sortedIntegrations = useMemo(() => {
    return orderBy(
      data || [],
      ['type', 'disabled', 'identifier'],
      ['desc', 'asc', 'asc']
    );
  }, [data]);

  return (
    <div
      data-cr="1"
      data-crhov={!mobile && channelsCollapsed ? '1' : '0'}
      className={clsx(
        'trz bg-pqInner flex flex-col transition-all relative',
        mobile
          ? 'w-full'
          : channelsCollapsed
          ? 'group sidebar w-[100px]'
          : 'w-[260px]'
      )}
    >
      <div className="absolute top-0 start-0 flex h-full w-full flex-col">
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
          {/* The collapse toggle only means anything on desktop — in the mobile
              drawer there is no narrow state to collapse to. */}
          <div
            onClick={() =>
              setCollapseMenu(collapseMenu === '1' ? '0' : '1', { days: 365 })
            }
            className={clsx(
              'flex h-[26px] w-[26px] shrink-0 cursor-pointer select-none items-center justify-center rounded-[7px] text-pqSoft hover:bg-pqHover hover:text-pqText group-[.sidebar]:mx-auto group-[.sidebar]:rotate-180',
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
          </div>
        </div>
        <div className="shrink-0 p-[12px_12px_10px]">
          <button
            data-pq="agent-add-channel"
            onClick={addProvider}
            className="flex h-[36px] w-full items-center justify-center gap-[7px] rounded-[9px] bg-pqSettings text-[12.5px] font-[600] text-pqText hover:brightness-110"
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
        <div className="flex flex-1 flex-col gap-[2px] overflow-y-auto overflow-x-hidden p-[0_8px_12px] scrollbar nBorder scrollbar-track-pqInner">
          {sortedIntegrations.map((integration) => {
            const isSelected = selected.some((p) => p.id === integration.id);
            return (
              <div
                onClick={setIntegration(integration)}
                key={integration.id}
                className={clsx(
                  'relative flex cursor-pointer items-center gap-[10px] rounded-pqSm py-[7px] ps-[9px] pe-[6px] transition-[background-color,opacity] hover:opacity-100 hover:shadow-[inset_0_0_0_999px_var(--brandFaint)] group-[.sidebar]:justify-center',
                  isSelected ? 'bg-pqBrandSoft' : 'opacity-60'
                )}
              >
                {isSelected && (
                  <span className="absolute -start-[8px] bottom-[8px] top-[8px] w-[3px] rounded-e-[4px] bg-pqBrand" />
                )}
                <div
                  className={clsx(
                    'relative h-[32px] w-[32px] shrink-0',
                    integration.disabled && 'opacity-50'
                  )}
                >
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
                    src={integration.picture}
                    className="rounded-[9px]"
                    alt={integration.identifier}
                    width={32}
                    height={32}
                  />
                  <SafeImage
                    src={`/icons/platforms/${integration.identifier}.png`}
                    className="absolute -bottom-[4px] -end-[5px] z-10 rounded-full shadow-[0_0_0_1.5px_var(--inner)]"
                    alt={integration.identifier}
                    width={17}
                    height={17}
                  />
                  {(integration.inBetweenSteps ||
                    integration.refreshNeeded) && (
                    <span className="absolute -start-[4px] -top-[4px] z-[3] flex h-[15px] w-[15px] items-center justify-center rounded-full bg-pqWarn text-[10px] text-pqOnBrand">
                      !
                    </span>
                  )}
                </div>
                <div
                  data-crl="1"
                  className={clsx(
                    'min-w-0 flex-1 leading-[1.3] group-[.sidebar]:hidden',
                    integration.disabled && 'opacity-50'
                  )}
                >
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[14px]">
                    {integration.name}
                  </div>
                  <div
                    className={clsx(
                      'overflow-hidden text-ellipsis whitespace-nowrap text-[12px]',
                      integration.refreshNeeded ? 'text-pqWarn' : 'text-pqMuted'
                    )}
                  >
                    {integration.identifier}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const PropertiesContext = createContext({ properties: [] });
export const Agent: FC<{ children: ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState([]);
  const t = useT();
  const { mobile } = useViewport();
  const rowRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<'channels' | 'threads' | null>(null);
  const [drawerTop, setDrawerTop] = useState(0);

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

  return (
    <PropertiesContext.Provider value={{ properties }}>
      <div ref={rowRef} className="flex flex-1 min-w-0">
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
          <AgentList onChange={setProperties} />
        </AgentDrawer>

        <div
          className={clsx(
            'bg-pqInner flex flex-1 flex-col min-w-0',
            // The hairline between the chat and the rail belongs to the
            // desktop layout — in drawer mode the rail is off-canvas.
            !asDrawer && 'border-e border-pqLine'
          )}
        >
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
        className={clsx(
          'flex h-[34px] shrink-0 items-center justify-center gap-[7px] whitespace-nowrap rounded-pqSm bg-pqBrand text-[13px] font-[600] text-pqOnBrand outline-none hover:brightness-105',
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
