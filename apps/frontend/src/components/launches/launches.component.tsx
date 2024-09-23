'use client';

import { AddProviderButton } from '@gitroom/frontend/components/launches/add.provider.component';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { orderBy } from 'lodash';
// import { Calendar } from '@gitroom/frontend/components/launches/calendar';
import { CalendarWeekProvider } from '@gitroom/frontend/components/launches/calendar.context';
import { Filters } from '@gitroom/frontend/components/launches/filters';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import clsx from 'clsx';
import { useUser } from '../layout/user.context';
import { Menu } from '@gitroom/frontend/components/launches/menu/menu';
import { useRouter, useSearchParams } from 'next/navigation';
import { Integration } from '@prisma/client';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import { Calendar } from './calendar';

export const LaunchesComponent = () => {
  const fetch = useFetch();
  const router = useRouter();
  const search = useSearchParams();
  const toast = useToaster();
  const fireEvents = useFireEvents();

  const [reload, setReload] = useState(false);
  const load = useCallback(async (path: string) => {
    return (await (await fetch(path)).json()).integrations;
  }, []);
  const user = useUser();

  const {
    isLoading,
    data: integrations,
    mutate,
  } = useSWR('/integrations/list', load, {
    fallbackData: [],
  });

  const totalNonDisabledChannels = useMemo(() => {
    return (
      integrations?.filter((integration: any) => !integration.disabled)
        ?.length || 0
    );
  }, [integrations]);

  const sortedIntegrations = useMemo(() => {
    return orderBy(
      integrations,
      ['type', 'disabled', 'identifier'],
      ['desc', 'asc', 'asc']
    );
  }, [integrations]);

  const update = useCallback(async (shouldReload: boolean) => {
    if (shouldReload) {
      setReload(true);
    }
    await mutate();

    if (shouldReload) {
      setReload(false);
    }
  }, []);

  const continueIntegration = useCallback(
    (integration: any) => async () => {
      router.push(
        `/launches?added=${integration.identifier}&continue=${integration.id}`
      );
    },
    []
  );

  const refreshChannel = useCallback(
    (integration: Integration & { identifier: string }) => async () => {
      const { url } = await (
        await fetch(
          `/integrations/social/${integration.identifier}?refresh=${integration.internalId}`,
          {
            method: 'GET',
          }
        )
      ).json();

      window.location.href = url;
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return ;
    }
    if (search.get('scope') === 'missing') {
      toast.show('You have to approve all the channel permissions', 'warning');
    }
    if (search.get('added')) {
      fireEvents('channel_added');
    }
    if (window.opener) {
      window.close();
    }
  }, []);

  if (isLoading || reload) {
    return <LoadingComponent />;
  }

  // @ts-ignore
  return (
    <CalendarWeekProvider integrations={sortedIntegrations}>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 relative">
          <div className="outline-none w-full h-full grid grid-cols-[220px_minmax(0,1fr)] gap-[30px] scrollbar scrollbar-thumb-tableBorder scrollbar-track-secondary">
              <div className="w-[220px] bg-third p-[16px] flex flex-col gap-[24px] min-h-[100%]">
              <h2 className="text-[20px]">Channels</h2>
              <div className="gap-[16px] flex flex-col">
                {sortedIntegrations.length === 0 && (
                  <div className="text-[12px]">No channels</div>
                )}
                {sortedIntegrations.map((integration) => (
                  <div
                    {...(integration.refreshNeeded && {
                      'data-tooltip-id': 'tooltip',
                      'data-tooltip-content':
                        'Channel disconnected, click to reconnect.',
                    })}
                    key={integration.id}
                    className="flex gap-[8px] items-center"
                  >
                    <div
                      className={clsx(
                        'relative w-[34px] h-[34px] rounded-full flex justify-center items-center bg-fifth',
                        integration.disabled && 'opacity-50'
                      )}
                    >
                      {(integration.inBetweenSteps ||
                        integration.refreshNeeded) && (
                        <div
                          className="absolute left-0 top-0 w-[39px] h-[46px] cursor-pointer"
                          onClick={
                            integration.refreshNeeded
                              ? refreshChannel(integration)
                              : continueIntegration(integration)
                          }
                        >
                          <div className="bg-red-500 w-[15px] h-[15px] rounded-full -left-[5px] -top-[5px] absolute z-[200] text-[10px] flex justify-center items-center">
                            !
                          </div>
                          <div className="bg-primary/60 w-[39px] h-[46px] left-0 top-0 absolute rounded-full z-[199]" />
                        </div>
                      )}
                      <ImageWithFallback
                        fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                        src={integration.picture}
                        className="rounded-full"
                        alt={integration.identifier}
                        width={32}
                        height={32}
                      />
                      {integration.identifier === 'youtube' ? (
                        <img
                          src="/icons/platforms/youtube.svg"
                          className="absolute z-10 -bottom-[5px] -right-[5px]"
                          width={20}
                        />
                      ) : (
                        <Image
                          src={`/icons/platforms/${integration.identifier}.png`}
                          className="rounded-full absolute z-10 -bottom-[5px] -right-[5px] border border-fifth"
                          alt={integration.identifier}
                          width={20}
                          height={20}
                        />
                      )}
                    </div>
                    <div
                      {...(integration.disabled &&
                      totalNonDisabledChannels === user?.totalChannels
                        ? {
                            'data-tooltip-id': 'tooltip',
                            'data-tooltip-content':
                              'This channel is disabled, please upgrade your plan to enable it.',
                          }
                        : {})}
                      className={clsx(
                        'flex-1 whitespace-nowrap text-ellipsis overflow-hidden',
                        integration.disabled && 'opacity-50'
                      )}
                    >
                      {integration.name}
                    </div>
                    <Menu
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
                ))}
              </div>
              <AddProviderButton update={() => update(true)} />
              {/*{sortedIntegrations?.length > 0 && user?.tier?.ai && <GeneratorComponent />}*/}
            </div>
            <div className="flex-1 flex flex-col gap-[14px]">
              <Filters />
              <Calendar />
            </div>
          </div>
        </div>
      </div>
    </CalendarWeekProvider>
  );
};
