import { AddProviderButton } from '@gitroom/frontend/components/launches/add.provider.component';
import { FC, useMemo } from 'react';
import Image from 'next/image';
import { orderBy } from 'lodash';
import { Calendar } from '@gitroom/frontend/components/launches/calendar';
import {CalendarWeekProvider, Integrations} from '@gitroom/frontend/components/launches/calendar.context';
import { Filters } from '@gitroom/frontend/components/launches/filters';

export const LaunchesComponent: FC<{
  integrations: Integrations[]
}> = (props) => {
  const { integrations } = props;

  const sortedIntegrations = useMemo(() => {
    return orderBy(integrations, ['type', 'identifier'], ['desc', 'asc']);
  }, [integrations]);

  return (
    <CalendarWeekProvider integrations={sortedIntegrations}>
      <div className="flex flex-1 flex-col">
        <Filters />
        <div className="flex flex-1 relative">
          <div className="absolute w-full h-full flex flex-1 gap-[30px] overflow-hidden overflow-y-scroll scrollbar scrollbar-thumb-tableBorder scrollbar-track-secondary">
            <div className="w-[220px] bg-third p-[16px] flex flex-col gap-[24px] sticky top-0">
              <h2 className="text-[20px]">Channels</h2>
              <div className="gap-[16px] flex flex-col">
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
                    <div>3</div>
                  </div>
                ))}
              </div>
              <AddProviderButton />
            </div>
            <div className="flex-1 flex flex-col gap-[14px]">
              <Calendar />
            </div>
          </div>
        </div>
      </div>
    </CalendarWeekProvider>
  );
};
