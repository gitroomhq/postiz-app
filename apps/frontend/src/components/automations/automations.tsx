'use client';

import useSWR from 'swr';
import { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useRouter } from 'next/navigation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import useCookie from 'react-use-cookie';
import { SVGLine } from '@gitroom/frontend/components/launches/launches.component';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { AutomationPlatform } from '@gitroom/frontend/components/automations/automation';
import { Plugs } from '@gitroom/frontend/components/plugs/plugs';

export const Automations = () => {
  const t = useT();
  const [tab, setTab] = useCookie('automationsTab', 'automations');
  return (
    <div className="flex flex-col flex-1 gap-[1px]">
      <div className="bg-newBgColorInner p-[12px] flex gap-[8px]">
        <Button
          secondary={tab !== 'automations'}
          onClick={() => setTab('automations')}
        >
          {t('automations', 'Automations')}
        </Button>
        <Button secondary={tab !== 'plugs'} onClick={() => setTab('plugs')}>
          {t('plugs', 'Plugs')}
        </Button>
      </div>
      <div className="flex flex-1 gap-[1px]">
        {tab === 'plugs' ? <Plugs /> : <AutomationsPlatforms />}
      </div>
    </div>
  );
};

export const AutomationsPlatforms = () => {
  const fetch = useFetch();
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const load = useCallback(async () => {
    return (await (await fetch('/integrations/list')).json()).integrations;
  }, []);
  const load2 = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: webhookList, isLoading: webhooksLoading } = useSWR(
    '/automations/list',
    load2,
    {
      fallbackData: { webhooks: [] },
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      revalidateOnMount: true,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
    }
  );
  const { data, isLoading } = useSWR('automations-integrations-list', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });

  const [collapseMenu, setCollapseMenu] = useCookie('collapseMenu', '0');

  const t = useT();

  const platforms = useMemo(() => {
    return (webhookList?.webhooks || []).filter((platform: any) =>
      data.some(
        (integration: any) => integration.identifier === platform.identifier
      )
    );
  }, [data, webhookList]);
  const currentPlatform = useMemo(() => {
    return platforms[current];
  }, [current, platforms]);

  if (isLoading || webhooksLoading) {
    return (
      <div className="bg-newBgColorInner p-[20px] flex flex-1 flex-col gap-[15px] transition-all items-center justify-center">
        <LoadingComponent />
      </div>
    );
  }

  if (!platforms.length && !isLoading) {
    return (
      <div className="bg-newBgColorInner p-[20px] flex flex-1 flex-col gap-[15px] transition-all items-center justify-center">
        <div>
          <img src="/peoplemarketplace.svg" />
        </div>
        <div className="text-[48px]">
          {t(
            'there_are_no_automations_matching_your_channels',
            'There are no automations matching your channels'
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
    <>
      <div
        className={clsx(
          'bg-newBgColorInner p-[20px] flex flex-col gap-[15px] transition-all',
          collapseMenu === '1' ? 'group sidebar w-[100px]' : 'w-[260px]'
        )}
      >
        <div className="flex gap-[12px] flex-col">
          <div className="flex items-center">
            <h2 className="group-[.sidebar]:hidden flex-1 text-[20px] font-[500]">
              {t('platforms', 'Platforms')}
            </h2>
            <div
              onClick={() => setCollapseMenu(collapseMenu === '1' ? '0' : '1')}
              className="group-[.sidebar]:rotate-[180deg] group-[.sidebar]:mx-auto text-btnText bg-btnSimple rounded-[6px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer select-none"
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
          {platforms.map((platform: any, index: number) => (
            <div
              key={platform.identifier}
              onClick={() => setCurrent(index)}
              className={clsx(
                'flex gap-[8px] items-center justify-center group/profile hover:bg-boxHover rounded-e-[8px]',
                currentPlatform.identifier !== platform.identifier &&
                  'opacity-20 hover:opacity-100 cursor-pointer'
              )}
            >
              <div className="relative rounded-full flex justify-center items-center gap-[8px]">
                <div className="h-full w-[4px] -ms-[12px] rounded-s-[3px] opacity-0 group-hover/profile:opacity-100 transition-opacity">
                  <SVGLine />
                </div>
                <SafeImage
                  src={`/icons/platforms/${platform.identifier}.png`}
                  className="rounded-[8px]"
                  alt={platform.identifier}
                  width={36}
                  height={36}
                />
              </div>
              <div className="flex-1 overflow-hidden group-[.sidebar]:hidden">
                <div className="whitespace-nowrap text-ellipsis overflow-hidden">
                  {platform.name.split('\n')[0]}
                </div>
                {!!platform.name.split('\n')[1] && (
                  <div className="text-[12px] opacity-60 whitespace-nowrap text-ellipsis overflow-hidden">
                    {platform.name.split('\n')[1]}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[12px]">
        <AutomationPlatform
          key={currentPlatform.identifier}
          platform={currentPlatform}
        />
      </div>
    </>
  );
};
