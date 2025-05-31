'use client';

import useSWR from 'swr';
import { useCallback, useMemo, useState } from 'react';
import { capitalize, orderBy } from 'lodash';
import clsx from 'clsx';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import Image from 'next/image';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Select } from '@gitroom/react/form/select';
import { Button } from '@gitroom/react/form/button';
import { useRouter } from 'next/navigation';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { PlugsContext } from '@gitroom/frontend/components/plugs/plugs.context';
import { Plug } from '@gitroom/frontend/components/plugs/plug';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const Plugs = () => {
  const fetch = useFetch();
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [refresh, setRefresh] = useState(false);
  const toaster = useToaster();
  const load = useCallback(async () => {
    return (await (await fetch('/integrations/list')).json()).integrations;
  }, []);
  const load2 = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: plugList, isLoading: plugLoading } = useSWR(
    '/integrations/plug/list',
    load2,
    {
      fallbackData: [],
    }
  );
  const { data, isLoading } = useSWR('analytics-list', load, {
    fallbackData: [],
  });

  const t = useT();

  const sortedIntegrations = useMemo(() => {
    return orderBy(
      data.filter((integration: any) =>
        plugList?.plugs?.some(
          (f: any) => f.identifier === integration.identifier
        )
      ),
      // data.filter((integration) => !integration.disabled),
      ['type', 'disabled', 'identifier'],
      ['desc', 'asc', 'asc']
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
    return null;
  }
  if (!sortedIntegrations.length && !isLoading) {
    return (
      <div className="flex flex-col items-center mt-[100px] gap-[27px] text-center">
        <div>
          <img src="/peoplemarketplace.svg" />
        </div>
        <div className="text-[48px]">
          {t(
            'there_are_not_plugs_matching_your_channels',
            'There are not plugs matching your channels'
          )}
          <br />
          {t(
            'you_have_to_add_x_or_linkedin_or_threads',
            'You have to add: X or LinkedIn or Threads'
          )}
        </div>
        <Button onClick={() => router.push('/launches')}>
          {t(
            'go_to_the_calendar_to_add_channels',
            'Go to the calendar to add channels'
          )}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex gap-[30px] flex-1">
      <div className="p-[16px] bg-customColor48 overflow-hidden flex w-[220px]">
        <div className="flex gap-[16px] flex-col overflow-hidden">
          <div className="text-[20px] mb-[8px]">
            {t('channels', 'Channels')}
          </div>
          {sortedIntegrations.map((integration, index) => (
            <div
              key={integration.id}
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
                setCurrent(index);
              }}
              className={clsx(
                'flex gap-[8px] items-center',
                currentIntegration.id !== integration.id &&
                  'opacity-20 hover:opacity-100 cursor-pointer'
              )}
            >
              <div
                className={clsx(
                  'relative w-[34px] h-[34px] rounded-full flex justify-center items-center bg-fifth',
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
                <ImageWithFallback
                  fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
                  src={integration.picture}
                  className="rounded-full"
                  alt={integration.identifier}
                  width={32}
                  height={32}
                />
                <Image
                  src={`/icons/platforms/${integration.identifier}.png`}
                  className="rounded-full absolute z-10 -bottom-[5px] -end-[5px] border border-fifth"
                  alt={integration.identifier}
                  width={20}
                  height={20}
                />
              </div>
              <div
                className={clsx(
                  'flex-1 whitespace-nowrap text-ellipsis overflow-hidden',
                  integration.disabled && 'opacity-50'
                )}
              >
                {integration.name}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-[14px]">
        <PlugsContext.Provider value={currentIntegrationPlug}>
          <Plug />
        </PlugsContext.Provider>
      </div>
    </div>
  );
};
