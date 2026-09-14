'use client';

import { PostsPanel } from '@gitroom/frontend/components/launches/posts.panel';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { sortIntegrationsByProviderImportance } from '@gitroom/frontend/components/launches/helpers/sort.integrations';
import {
  CalendarWeekProvider,
  useCalendar,
} from '@gitroom/frontend/components/launches/calendar.context';
import { Filters } from '@gitroom/frontend/components/launches/filters';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Skeleton } from '@gitroom/react/ui/skeleton';
import clsx from 'clsx';
import { useUser } from '../layout/user.context';
import { Menu } from '@gitroom/frontend/components/launches/menu/menu';
import { useSearchParams } from 'next/navigation';
import type { Integration } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import { Calendar } from './calendar';
import { useDrag, useDrop } from 'react-dnd';
import { DNDProvider } from '@gitroom/frontend/components/launches/helpers/dnd.provider';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { formatChannelHandle, channelNameWithHandle } from '@gitroom/frontend/components/channels/channel-handle';

/**
 * Ghost for this page while the channel list resolves.
 *
 * It reads `display` and `postsPanelOpen` out of the calendar context rather
 * than assuming, because all four displays reach this component and they do not
 * share a shape: `list` has no queue panel at all and is full-bleed, and a
 * collapsed panel is the 44px rail, not the 280px body. A skeleton that always
 * drew the expanded panel and a 7-column grid snapped 236–280px sideways the
 * moment the real page arrived — which is the whole failure a skeleton exists to
 * avoid. Reading the context is only possible because the page mounts the
 * provider around this, see the note on the return below.
 *
 * Both values come from cookies, so they are correct on the very first paint.
 */
const LaunchesSkeleton = () => {
  const { display, postsPanelOpen } = useCalendar();
  const isList = display === 'list';

  return (
    <>
      {!isList &&
        (postsPanelOpen ? (
          <div
            role="status"
            aria-busy="true"
            aria-label="Loading"
            className="flex w-[280px] shrink-0 flex-col overflow-hidden bg-pqInner tablet:w-[236px] mobile:hidden"
          >
            <div className="flex shrink-0 flex-col gap-[12px] px-[14px] pb-[12px] pt-[16px]">
              <div className="flex items-center gap-[8px]">
                <Skeleton className="h-[15px] w-[54px]" />
                <Skeleton className="ms-auto h-[28px] w-[96px] rounded-pqSm" />
              </div>
              <div className="flex shrink-0 gap-[2px] rounded-pqSm bg-pqSettings p-[2px]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-[28px] min-w-0 flex-1 rounded-[6px]"
                  />
                ))}
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-[6px] px-[12px] pb-[14px]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[76px] w-full rounded-[10px]" />
              ))}
            </div>
          </div>
        ) : (
          // Collapsed: the rail is 44px with a single toggle button on it.
          <div className="flex w-[44px] shrink-0 flex-col items-center bg-pqInner py-[16px] mobile:hidden">
            <Skeleton className="size-[28px] rounded-pqSm" />
          </div>
        ))}

      <div
        {...(isList
          ? { role: 'status', 'aria-busy': true, 'aria-label': 'Loading' }
          : {})}
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-[12px] bg-pqInner p-[20px] mobile:p-[12px]"
      >
        <div className="flex items-center gap-[8px]">
          <Skeleton className="h-[32px] w-[132px] rounded-[9px]" />
          <Skeleton className="h-[32px] w-[92px] rounded-[9px]" />
          <div className="flex-1" />
          <Skeleton className="h-[32px] w-[118px] rounded-[9px]" />
        </div>
        {isList ? (
          // Posts: one scrolling column of rows, no grid.
          <div className="flex min-h-0 flex-1 flex-col gap-[10px]">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] w-full rounded-[12px]" />
            ))}
          </div>
        ) : (
          // Week, month and day are all seven columns wide; the rows stay
          // blocks rather than day cells so none of the three is contradicted.
          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_1fr] gap-[8px]">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={`h-${i}`} className="h-[12px] w-[62%]" />
            ))}
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton
                key={`c-${i}`}
                className="min-h-[180px] w-full rounded-[12px]"
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

/** Prototype hides the queue on the Posts (list) page. */
const PostsPanelWhenCalendar = () => {
  const { display } = useCalendar();
  if (display === 'list') return null;
  return <PostsPanel />;
};

/**
 * List view: Filters + posts scroll as one column (no inner-only scrollbar).
 * Week/day/month keep Filters fixed and scroll inside the calendar grid.
 */
const LaunchesMainColumn = () => {
  const { display } = useCalendar();
  const isList = display === 'list';
  return (
    <div
      className={clsx(
        'flex min-h-0 min-w-0 flex-1 flex-col gap-[12px] bg-pqInner p-[20px] mobile:p-[12px]',
        isList &&
          'overflow-y-auto scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner'
      )}
    >
      <Filters />
      <div
        className={clsx(
          'flex min-w-0',
          isList ? 'flex-col' : 'min-h-0 flex-1'
        )}
      >
        <Calendar />
      </div>
    </div>
  );
};

export const SVGLine = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="5"
      height="52"
      viewBox="0 0 5 52"
      fill="none"
      className="rtl:rotate-180"
    >
      <path
        d="M0.5 4C0.5 1.79086 2.29086 0 4.5 0V52C2.29086 52 0.5 50.2091 0.5 48V4Z"
        fill="url(#paint0_linear_1930_1119)"
      />
      <path
        d="M0.5 4C0.5 1.79086 2.29086 0 4.5 0V52C2.29086 52 0.5 50.2091 0.5 48V4Z"
        fill="url(#paint1_radial_1930_1119)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_1930_1119"
          x1="-7"
          y1="-27.7727"
          x2="-2.58929"
          y2="-28.6843"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#662FDA" />
          <stop offset="1" stopColor="#5720CB" />
        </linearGradient>
        <radialGradient
          id="paint1_radial_1930_1119"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(1.19333 7.45342) rotate(21.2064) scale(16.1503 188.627)"
        >
          <stop stopColor="#8C66FF" />
          <stop offset="1" stopColor="#8C66FF" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
};
interface MenuComponentInterface {
  refreshChannel: (
    integration: Integration & {
      identifier: string;
    }
  ) => () => void;
  collapsed: boolean;
  continueIntegration: (integration: Integration) => () => void;
  totalNonDisabledChannels: number;
  mutate: (shouldReload?: boolean) => void;
  update: (shouldReload: boolean) => void;
}
export const OpenClose: FC<{
  isOpen: boolean;
}> = (props) => {
  const { isOpen } = props;
  return (
    <svg
      width="11"
      height="6"
      viewBox="0 0 22 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(
        'rotate-180 transition-all',
        isOpen ? 'rotate-180' : 'rotate-90'
      )}
    >
      <path
        d="M21.9245 11.3823C21.8489 11.5651 21.7207 11.7213 21.5563 11.8312C21.3919 11.9411 21.1986 11.9998 21.0008 11.9998H1.00079C0.802892 12 0.609399 11.9414 0.444805 11.8315C0.280212 11.7217 0.151917 11.5654 0.076165 11.3826C0.000412494 11.1998 -0.0193921 10.9986 0.0192583 10.8045C0.0579087 10.6104 0.153276 10.4322 0.293288 10.2923L10.2933 0.29231C10.3862 0.199333 10.4964 0.125575 10.6178 0.0752506C10.7392 0.0249263 10.8694 -0.000976562 11.0008 -0.000976562C11.1322 -0.000976562 11.2623 0.0249263 11.3837 0.0752506C11.5051 0.125575 11.6154 0.199333 11.7083 0.29231L21.7083 10.2923C21.8481 10.4322 21.9433 10.6105 21.9818 10.8045C22.0202 10.9985 22.0003 11.1996 21.9245 11.3823Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const MenuGroupComponent: FC<
  MenuComponentInterface & {
    changeItemGroup: (id: string, group: string) => void;
    group: {
      id: string;
      name: string;
      values: Array<
        Integration & {
          identifier: string;
          changeProfilePicture: boolean;
          changeNickName: boolean;
        }
      >;
    };
  }
> = (props) => {
  const {
    group,
    mutate,
    update,
    continueIntegration,
    totalNonDisabledChannels,
    refreshChannel,
    changeItemGroup,
    collapsed,
  } = props;
  const [isOpen, setIsOpen] = useState(
    !!+(localStorage.getItem(group.name + '_isOpen') || '1')
  );
  const changeOpenClose = useCallback(
    (e: any) => {
      setIsOpen(!isOpen);
      localStorage.setItem(group.name + '_isOpen', isOpen ? '0' : '1');
      e.stopPropagation();
    },
    [isOpen]
  );
  const [collectedProps, drop] = useDrop(() => ({
    accept: 'menu',
    drop: (
      item: {
        id: string;
      },
      monitor
    ) => {
      changeItemGroup(item.id, group.id);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));
  return (
    <div
      className="gap-[16px] flex flex-col relative"
      // @ts-ignore
      ref={drop}
    >
      {collectedProps.isOver && (
        <div className="absolute start-0 top-0 w-full h-full pointer-events-none">
          <div className="w-full h-full start-0 top-0 relative">
            <div className="bg-white/30 w-full h-full p-[8px] box-content rounded-md" />
          </div>
        </div>
      )}
      {!!group.name && (
        <div
          className="flex items-center gap-[5px] cursor-pointer"
          onClick={changeOpenClose}
        >
          <div>
            <OpenClose isOpen={isOpen} />
          </div>
          <div
            className="line-clamp-1"
            {...(collapsed
              ? {
                  'data-tooltip-id': 'tooltip',
                  'data-tooltip-content': group.name,
                }
              : {})}
          >
            {group.name}
          </div>
        </div>
      )}
      <div
        className={clsx(
          'gap-[12px] flex flex-col relative',
          !isOpen && 'hidden'
        )}
      >
        {group.values.map((integration) => (
          <MenuComponent
            collapsed={collapsed}
            key={integration.id}
            integration={integration}
            mutate={mutate}
            continueIntegration={continueIntegration}
            update={update}
            refreshChannel={refreshChannel}
            totalNonDisabledChannels={totalNonDisabledChannels}
          />
        ))}
      </div>
    </div>
  );
};
export const MenuComponent: FC<
  MenuComponentInterface & {
    integration: Integration & {
      identifier: string;
      changeProfilePicture: boolean;
      changeNickName: boolean;
      refreshNeeded?: boolean;
      display?: string;
    };
  }
> = (props) => {
  const {
    totalNonDisabledChannels,
    continueIntegration,
    refreshChannel,
    mutate,
    update,
    integration,
    collapsed,
  } = props;
  const user = useUser();
  const t = useT();
  const [collected, drag, dragPreview] = useDrag(() => ({
    type: 'menu',
    item: {
      id: integration.id,
    },
  }));
  return (
    <div
      // @ts-ignore
      ref={dragPreview}
      {...(integration.refreshNeeded && {
        onClick: refreshChannel(integration),
        'data-tooltip-id': 'tooltip',
        'data-tooltip-content': t(
          'channel_disconnected_click_to_reconnect',
          'Channel disconnected, click to reconnect.'
        ),
      })}
      {...(collapsed
        ? {
            'data-tooltip-id': 'tooltip',
            'data-tooltip-content': channelNameWithHandle(integration),
          }
        : {})}
      className={clsx(
        'flex gap-[12px] items-center bg-pqInner hover:bg-pqHover group/profile transition-all rounded-e-[8px]',
        integration.refreshNeeded && 'cursor-pointer'
      )}
    >
      <div
        className={clsx(
          'relative gap-[6px] flex justify-center items-center',
          integration.disabled && 'opacity-50'
        )}
      >
        <div className="h-full w-[4px] -ms-[12px] rounded-s-[3px] opacity-0 group-hover/profile:opacity-100 transition-opacity">
          <SVGLine />
        </div>
        {(integration.inBetweenSteps || integration.refreshNeeded) && (
          <div
            className="absolute start-0 top-0 w-[39px] h-[46px] cursor-pointer"
            onClick={
              integration.refreshNeeded
                ? refreshChannel(integration)
                : continueIntegration(integration)
            }
          >
            <div className="absolute start-[5px] top-[5px] z-[200] flex h-[15px] w-[15px] items-center justify-center rounded-full bg-pqWarn text-[10px] font-[700] text-pqOnBrand">
              !
            </div>
            <div className="absolute start-0 top-0 z-[199] h-[46px] w-[39px] rounded-full bg-pqBrand/60" />
          </div>
        )}
        <ImageWithFallback
          fallbackSrc={'/no-picture.jpg'}
          src={integration.picture || '/no-picture.jpg'}
          className="rounded-[8px] min-w-[36px] min-h-[36px]"
          alt={integration.identifier}
          width={36}
          height={36}
        />
        {integration.identifier === 'youtube' ? (
          <img
            src="/icons/platforms/youtube.svg"
            className="absolute z-10 bottom-[5px] -end-[5px]"
            width={20}
          />
        ) : (
          <SafeImage
            src={`/icons/platforms/${integration.identifier}.png`}
            className="rounded-[8px] absolute z-10 bottom-[5px] -end-[5px] border border-fifth"
            alt={integration.identifier}
            width={18.41}
            height={18.41}
          />
        )}
      </div>
      <div
        // @ts-ignore
        ref={drag}
        {...(integration.disabled &&
        totalNonDisabledChannels === user?.totalChannels
          ? {
              'data-tooltip-id': 'tooltip',
              'data-tooltip-content': t(
                'channel_disabled_upgrade_plan',
                'This channel is disabled, please upgrade your plan to enable it.'
              ),
            }
          : {})}
        role="Handle"
        className={clsx(
          'group-[.sidebar]:hidden flex min-w-0 flex-1 flex-col justify-center cursor-move',
          integration.disabled && 'opacity-50'
        )}
      >
        <span className="truncate whitespace-nowrap text-ellipsis">
          {integration.name}
        </span>
        {!!formatChannelHandle(integration.display) && (
          <span className="truncate text-[12px] text-pqMuted">
            {formatChannelHandle(integration.display)}
          </span>
        )}
      </div>
      <Menu
        canChangeProfilePicture={integration.changeProfilePicture}
        canChangeNickName={integration.changeNickName}
        refreshChannel={refreshChannel}
        mutate={mutate}
        onChange={update}
        id={integration.id}
        canEnable={
          user?.totalChannels! > totalNonDisabledChannels &&
          integration.disabled
        }
        canDisable={!integration.disabled}
      />
    </div>
  );
};
export const LaunchesComponent = () => {
  const search = useSearchParams();
  const toast = useToaster();
  const fireEvents = useFireEvents();
  const t = useT();
  const { isLoading, data: integrations } = useIntegrationList();

  const sortedIntegrations = useMemo(() => {
    return sortIntegrationsByProviderImportance(integrations || []);
  }, [integrations]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (search.get('msg')) {
      toast.show(search.get('msg')!, 'success');
      window?.opener?.postMessage(
        {
          msg: search.get('msg')!,
          success: false,
        },
        '*'
      );
    }
    if (search.get('added')) {
      fireEvents('channel_added');
      window?.opener?.postMessage(
        {
          msg: t('channel_added', 'Channel added'),
          success: true,
        },
        '*'
      );
    }
    if (window.opener) {
      window.close();
    }
  }, []);
  // @ts-ignore
  return (
    <DNDProvider>
      {/* The skeleton renders *inside* the provider, not instead of it.
          `CalendarWeekProvider`'s mount is what starts `/posts`,
          `/posts/list` and `/signatures/default`, so returning early held that
          wave behind `/integrations/list` and made the cold load two loading
          screens instead of one. (`/sets` was never gated — the chrome header's
          `NewPost` calls `useSets()` on every route under the same key.)

          It can mount this early because it never reads `integrations`:
          the prop is declared, defaulted and handed straight to the context
          value, and no fetcher, SWR key or filter in calendar.context.tsx
          touches it. `sortedIntegrations` is already `[]` while loading, which
          is the provider's own default anyway, and every consumer downstream
          checks `?.length`. */}
      <CalendarWeekProvider integrations={sortedIntegrations} ready={!isLoading}>
        {isLoading ? (
          <LaunchesSkeleton />
        ) : (
          <>
            {/* Create Post lives in the chrome header (layout.component.tsx) so
                it is present on every route and before the first channel
                exists. */}
            {/* Design: queue panel beside calendar only. Posts (list) is
                full-bleed. */}
            <PostsPanelWhenCalendar />
            <LaunchesMainColumn />
          </>
        )}
      </CalendarWeekProvider>
    </DNDProvider>
  );
};
