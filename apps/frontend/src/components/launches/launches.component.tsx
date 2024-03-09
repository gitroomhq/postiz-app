'use client';

import { AddProviderButton } from '@gitroom/frontend/components/launches/add.provider.component';
import { useCallback, useMemo } from 'react';
import Image from 'next/image';
import { orderBy } from 'lodash';
import { Calendar } from '@gitroom/frontend/components/launches/calendar';
import { CalendarWeekProvider } from '@gitroom/frontend/components/launches/calendar.context';
import { Filters } from '@gitroom/frontend/components/launches/filters';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

export const LaunchesComponent = () => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return (await (await fetch(path)).json()).integrations;
  }, []);

  const { isLoading, data: integrations } = useSWR('/integrations/list', load, {
    fallbackData: [],
  });

  const sortedIntegrations = useMemo(() => {
    return orderBy(integrations, ['type', 'identifier'], ['desc', 'asc']);
  }, [integrations]);

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <CalendarWeekProvider integrations={sortedIntegrations}>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 relative">
          <div className="absolute w-full h-full flex flex-1 gap-[30px] overflow-hidden overflow-y-scroll scrollbar scrollbar-thumb-tableBorder scrollbar-track-secondary">
            <div className="w-[220px] bg-third p-[16px] flex flex-col gap-[24px] sticky top-0">
              <h2 className="text-[20px]">Channels</h2>
              <div className="gap-[16px] flex flex-col">
                {sortedIntegrations.length === 0 && (
                  <div className="text-[12px]">No channels</div>
                )}
                {sortedIntegrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex gap-[8px] items-center"
                  >
                    <div className="relative w-[34px] h-[34px] rounded-full flex justify-center items-center bg-fifth">
                      <img
                        src={integration.picture}
                        className="rounded-full"
                        alt={integration.identifier}
                        width={32}
                        height={32}
                      />
                      <Image
                        src={`/icons/platforms/${integration.identifier}.png`}
                        className="rounded-full absolute z-10 -bottom-[5px] -right-[5px] border border-fifth"
                        alt={integration.identifier}
                        width={20}
                        height={20}
                      />
                    </div>
                    <div className="flex-1">{integration.name}</div>
                  </div>
                ))}
              </div>
              <AddProviderButton />
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
