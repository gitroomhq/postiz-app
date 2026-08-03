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
import { SVGLine } from '@gitroom/frontend/components/launches/launches.component';
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
  const t = useT();
  if (!waitForClass) return null;
  return (
    <div className="pl-[14px] pr-[24px] whitespace-nowrap editor rm-bg">
      <MultiMediaComponent
        allData={[{ content: value }]}
        text={value}
        label={t('attachments', 'Attachments')}
        description=""
        value={media}
        dummy={false}
        name="image"
        onChange={setMedia}
        onOpen={() => {}}
        onClose={() => {}}
      />
    </div>
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

  const { data } = useSWR('integrations', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });

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
        'trz bg-newBgColorInner flex flex-col gap-[15px] transition-all relative',
        mobile
          ? 'w-full'
          : channelsCollapsed
          ? 'group sidebar w-[100px]'
          : 'w-[260px]'
      )}
    >
      <div className="absolute top-0 start-0 w-full h-full p-[20px] overflow-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
        <div className="flex items-center">
          <h2
            data-crl="1"
            className="group-[.sidebar]:hidden flex-1 text-[20px] font-[500] mb-[15px]"
          >
            {t('select_channels', 'Select Channels')}
          </h2>
          {/* The collapse toggle only means anything on desktop — in the mobile
              drawer there is no narrow state to collapse to. */}
          <div
            onClick={() =>
              setCollapseMenu(collapseMenu === '1' ? '0' : '1', { days: 365 })
            }
            className={clsx(
              '-mt-3 group-[.sidebar]:rotate-[180deg] group-[.sidebar]:mx-auto text-btnText bg-btnSimple rounded-[6px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer select-none',
              mobile && 'hidden'
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="7"
              height="13"
              viewBox="0 0 7 13"
              fill="none"
            >
              <path
                d="M6 11.5L1 6.5L6 1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <div className={clsx('flex flex-col gap-[15px]')}>
          {sortedIntegrations.map((integration, index) => (
            <div
              onClick={setIntegration(integration)}
              key={integration.id}
              className={clsx(
                'flex gap-[12px] items-center group/profile justify-center hover:bg-boxHover rounded-e-[8px] hover:opacity-100 cursor-pointer',
                !selected.some((p) => p.id === integration.id) && 'opacity-20'
              )}
            >
              <div
                className={clsx(
                  'relative rounded-full flex justify-center items-center gap-[6px]',
                  integration.disabled && 'opacity-50'
                )}
              >
                {(integration.inBetweenSteps || integration.refreshNeeded) && (
                  <div className="absolute start-0 top-0 w-[39px] h-[46px] cursor-pointer">
                    <div className="bg-red-500 w-[15px] h-[15px] rounded-full start-0 -top-[5px] absolute z-[200] text-[10px] flex justify-center items-center">
                      !
                    </div>
                    <div className="bg-primary/60 w-[39px] h-[46px] start-0 top-0 absolute rounded-full z-[199]" />
                  </div>
                )}
                <div className="h-full w-[4px] -ms-[12px] rounded-s-[3px] opacity-0 group-hover/profile:opacity-100 transition-opacity">
                  <SVGLine />
                </div>
                <ImageWithFallback
                  fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                  src={integration.picture}
                  className="rounded-[8px]"
                  alt={integration.identifier}
                  width={36}
                  height={36}
                />
                <SafeImage
                  src={`/icons/platforms/${integration.identifier}.png`}
                  className="rounded-[8px] absolute z-10 bottom-[5px] -end-[5px] border border-fifth"
                  alt={integration.identifier}
                  width={18.41}
                  height={18.41}
                />
              </div>
              <div
                data-crl="1"
                className={clsx(
                  'flex-1 whitespace-nowrap text-ellipsis overflow-hidden group-[.sidebar]:hidden',
                  integration.disabled && 'opacity-50'
                )}
              >
                {integration.name}
              </div>
            </div>
          ))}
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

        <div className="bg-newBgColorInner flex flex-1 flex-col min-w-0">
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

  return (
    // Below 760 this lives in a drawer (see `Agent`) and fills it. Two fixed
    // 260px columns beside the chat left it nothing at phone widths — the page
    // rendered with no usable conversation area at all, and did so before the
    // migration too.
    <div
      className={clsx(
        'trz bg-newBgColorInner flex shrink-0 flex-col gap-[15px] transition-all relative',
        mobile ? 'w-full' : 'w-[260px]'
      )}
    >
      <div className="absolute top-0 start-0 w-full h-full p-[20px] overflow-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
        <div className="mb-[15px] justify-center flex group-[.sidebar]:pb-[15px]">
          <Link
            href={`/agents`}
            className="text-white whitespace-nowrap flex-1 pt-[12px] pb-[14px] ps-[16px] pe-[20px] group-[.sidebar]:p-0 min-h-[44px] max-h-[44px] rounded-md bg-btnPrimary flex justify-center items-center gap-[5px] outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
              className="min-w-[21px] min-h-[20px]"
            >
              <path
                d="M10.5001 4.16699V15.8337M4.66675 10.0003H16.3334"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex-1 text-start text-[16px] group-[.sidebar]:hidden">
              {t('start_a_new_chat', 'Start a new chat')}
            </div>
          </Link>
        </div>
        <div className="flex flex-col gap-[1px]">
          {data?.threads?.map((p: any) => (
            <Link
              className={clsx(
                'overflow-ellipsis overflow-hidden whitespace-nowrap hover:bg-newBgColor px-[10px] py-[6px] rounded-[10px] cursor-pointer',
                p.id === id && 'bg-newBgColor'
              )}
              href={`/agents/${p.id}`}
              key={p.id}
            >
              {p.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
