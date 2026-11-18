'use client';

import useSWR from 'swr';
import { useCallback, useMemo, useState } from 'react';
import { capitalize, orderBy } from 'lodash';
import clsx from 'clsx';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Select } from '@gitroom/react/form/select';
import { Button } from '@gitroom/react/form/button';
import { useRouter } from 'next/navigation';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { PlugsContext } from '@gitroom/frontend/components/plugs/plugs.context';
import { Plug } from '@gitroom/frontend/components/plugs/plug';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
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
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      revalidateOnMount: true,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
    }
  );
  const { data, isLoading } = useSWR('analytics-list', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
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
    return (
      <div className="flex flex-col items-center justify-center">
        <LoadingComponent />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex flex-col">
        <h3 className="text-[20px]">{t('plugs', 'Plugs')}</h3>
      </div>
      {!sortedIntegrations.length ? (
        <div className="bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[16px] items-start">
          <div className="text-customColor18">
            {t(
              'there_are_not_plugs_matching_your_channels',
              'There are not plugs matching your channels'
            )}
            <br />
            {t(
              'you_have_to_add_x_linkedin_page_threads_or_bluesky',
              'You have to add: X, LinkedIn Page, Threads or Bluesky'
            )}
          </div>
          <Button onClick={() => router.push('/launches')}>
            {t(
              'go_to_the_calendar_to_add_channels',
              'Go to the calendar to add channels'
            )}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-[8px]">
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
                  'flex gap-[8px] items-center px-[12px] py-[8px] rounded-[8px] hover:bg-boxHover cursor-pointer',
                  currentIntegration.id === integration.id
                    ? 'bg-boxHover'
                    : 'opacity-40 hover:opacity-100'
                )}
              >
                <div
                  className={clsx(
                    'relative rounded-full flex justify-center items-center',
                    integration.disabled && 'opacity-50'
                  )}
                >
                  {(integration.inBetweenSteps ||
                    integration.refreshNeeded) && (
                    <div className="absolute start-0 top-0 w-[36px] h-[36px] cursor-pointer">
                      <div className="bg-red-500 w-[15px] h-[15px] rounded-full start-0 -top-[5px] absolute z-[200] text-[10px] flex justify-center items-center">
                        !
                      </div>
                      <div className="bg-primary/60 w-[36px] h-[36px] start-0 top-0 absolute rounded-full z-[199]" />
                    </div>
                  )}
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
                    className="rounded-[8px] absolute z-10 bottom-[-5px] -end-[5px] border border-fifth"
                    alt={integration.identifier}
                    width={18.41}
                    height={18.41}
                  />
                </div>
                <div
                  className={clsx(
                    'max-w-[160px] whitespace-nowrap text-ellipsis overflow-hidden',
                    integration.disabled && 'opacity-50'
                  )}
                >
                  {integration.name}
                </div>
              </div>
            ))}
          </div>
          <PlugsContext.Provider value={currentIntegrationPlug}>
            <Plug />
          </PlugsContext.Provider>
        </>
      )}
    </div>
  );
};
