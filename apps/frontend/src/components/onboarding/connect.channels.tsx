'use client';

import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { orderBy } from 'lodash';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import clsx from 'clsx';
import Image from 'next/image';
import { Menu } from '@gitroom/frontend/components/launches/menu/menu';
import { ApiModal } from '@gitroom/frontend/components/launches/add.provider.component';
import { useRouter } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export const ConnectChannels: FC = () => {
  const fetch = useFetch();
  const { isGeneral } = useVariables();
  const router = useRouter();
  const [identifier, setIdentifier] = useState<any>(undefined);
  const [popup, setPopups] = useState<undefined | string[]>(undefined);

  const getIntegrations = useCallback(async () => {
    return (await fetch('/integrations')).json();
  }, []);

  const [reload, setReload] = useState(false);

  const getSocialLink = useCallback(
    (identifier: string) => async () => {
      const { url } = await (
        await fetch('/integrations/social/' + identifier)
      ).json();

      window.open(url, 'Social Connect', 'width=700,height=700');
    },
    []
  );

  const load = useCallback(async (path: string) => {
    const list = (await (await fetch(path)).json()).integrations;
    setPopups(list.map((p: any) => p.id));
    return list;
  }, []);

  const { data: integrations, mutate } = useSWR('/integrations/list', load, {
    fallbackData: [],
  });

  const user = useUser();

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

  useEffect(() => {
    if (sortedIntegrations.length === 0 || !popup) {
      return;
    }

    const betweenSteps = sortedIntegrations.find((p) => p.inBetweenSteps);
    if (betweenSteps && popup.indexOf(betweenSteps.id) === -1) {
      const url = new URL(window.location.href);
      url.searchParams.append('added', betweenSteps.identifier);
      url.searchParams.append('continue', betweenSteps.id);
      router.push(url.toString());
      setPopups([...popup, betweenSteps.id]);
    }
  }, [sortedIntegrations, popup]);

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
      const url = new URL(window.location.href);
      url.searchParams.append('added', integration.identifier);
      url.searchParams.append('continue', integration.id);
      router.push(url.toString());
    },
    []
  );

  const finishUpdate = useCallback(() => {
    setIdentifier(undefined);
    update(true);
  }, []);

  const { data } = useSWR('get-all-integrations', getIntegrations);

  return (
    <>
      {!!identifier && (
        <div className="absolute w-full h-full bg-primary/80 left-0 top-0 z-[200] p-[30px] flex items-center justify-center">
          <div className="w-[400px]">
            <ApiModal
              close={() => setIdentifier(undefined)}
              update={finishUpdate}
              identifier={identifier.identifier}
              name={identifier.name}
            />
          </div>
        </div>
      )}
      <div className="flex flex-col">
        <div className="flex gap-[4px] flex-col">
          <div className="text-[20px]">Connect Channels</div>
          <div className="text-[14px] text-customColor18">
            Connect your social media and publishing websites channels to
            schedule posts later
          </div>
        </div>
        <div className="flex border border-customColor47 rounded-[4px] mt-[16px]">
          <div className="flex-1 flex flex-col p-[16px] gap-[10px]">
            <div className="text-[18px]">Social</div>
            <div className="grid grid-cols-3 gap-[16px]">
              {data?.social.map((social: any) => (
                <div
                  key={social.identifier}
                  onClick={getSocialLink(social.identifier)}
                  className="h-[96px] bg-input flex flex-col justify-center items-center gap-[10px] cursor-pointer"
                >
                  <div>
                    <Image
                      alt={social.identifier}
                      src={`/icons/platforms/${social.identifier}.png`}
                      className="rounded-full w-[32px] h-[32px]"
                      width={32}
                      height={32}
                    />
                  </div>
                  <div className="text-inputText text-[10px] tracking-[1.2px] uppercase">
                    {social.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {!isGeneral && (
            <div className="flex-1 flex flex-col p-[16px] gap-[10px]">
              <div className="text-[18px]">Publishing Platforms</div>
              <div className="grid grid-cols-3 gap-[16px]">
                {data?.article.map((article: any) => (
                  <div
                    onClick={() => setIdentifier(article)}
                    key={article.identifier}
                    className="h-[96px] bg-input flex flex-col justify-center items-center gap-[10px] cursor-pointer"
                  >
                    <div>
                      <img
                        src={`/icons/platforms/${article.identifier}.png`}
                        className="rounded-full w-[32px] h-[32px]"
                      />
                    </div>
                    <div className="text-inputText text-[10px] tracking-[1.2px] uppercase">
                      {article.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="my-[24px] border border-customColor47 rounded-[4px] p-[16px]">
          <div className="gap-[16px] flex flex-col">
            {sortedIntegrations.length === 0 && (
              <div className="text-[12px]">No channels</div>
            )}
            {sortedIntegrations.map((integration) => (
              <div key={integration.id} className="flex gap-[8px] items-center">
                <div
                  className={clsx(
                    'relative w-[34px] h-[34px] rounded-full flex justify-center items-center bg-fifth',
                    integration.disabled && 'opacity-50'
                  )}
                >
                  {integration.inBetweenSteps && (
                    <div
                      className="absolute left-0 top-0 w-[39px] h-[46px] cursor-pointer"
                      onClick={continueIntegration(integration)}
                    >
                      <div className="bg-red-500 w-[15px] h-[15px] rounded-full -left-[5px] -top-[5px] absolute z-[200] text-[10px] flex justify-center items-center">
                        !
                      </div>
                      <div className="bg-primary/60 w-[39px] h-[46px] left-0 top-0 absolute rounded-full z-[199]" />
                    </div>
                  )}
                  <Image
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
                    'flex-1',
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
        </div>
      </div>
    </>
  );
};
