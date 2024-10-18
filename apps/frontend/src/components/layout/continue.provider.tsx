import React, { FC, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { continueProviderList } from '@gitroom/frontend/components/launches/providers/continue-provider/list';
import { IntegrationContext } from '@gitroom/frontend/components/launches/helpers/use.integration';
import dayjs from 'dayjs';
import useSWR, { useSWRConfig } from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

import { ReactComponent as CloseXSvg } from '@gitroom/frontend/assets/close-x.svg';

export const Null: FC<{ closeModal: () => void; existingId: string[] }> = () =>
  null;
export const ContinueProvider: FC = () => {
  const { mutate } = useSWRConfig();
  const fetch = useFetch();
  const searchParams = useSearchParams();
  const added = searchParams.get('added');
  const continueId = searchParams.get('continue');
  const router = useRouter();

  const load = useCallback(async (path: string) => {
    const list = (await (await fetch(path)).json()).integrations;
    return list;
  }, []);

  const { data: integrations } = useSWR('/integrations/list', load, {
    fallbackData: [],
  });

  const closeModal = useCallback(() => {
    mutate('/integrations/list');
    const url = new URL(window.location.href);
    url.searchParams.delete('added');
    url.searchParams.delete('continue');
    router.push(url.toString());
  }, []);

  const Provider = useMemo(() => {
    if (!added) {
      return Null;
    }
    return (
      continueProviderList[added as keyof typeof continueProviderList] || Null
    );
  }, [added]);

  if (!added || !continueId || !integrations) {
    return null;
  }

  return (
    <div
      className="fixed left-0 top-0 w-full h-full bg-primary/40 z-[499]"
      onClick={closeModal}
    >
      <div
        className="w-[100%] max-w-[674px] absolute left-[50%] top-[65px] bg-customColor3 z-[500] -translate-x-[50%] text-textColor p-[16px] !pt-0 border border-customColor6 min-h-[300px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full h-full relative">
          <TopTitle title="Configure Provider" />
          <button
            onClick={closeModal}
            className="outline-none absolute right-0 top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
            type="button"
          >
            <CloseXSvg />
          </button>
          <div className="pt-[16px]">
            <IntegrationContext.Provider
              value={{
                date: dayjs(),
                value: [],
                integration: {
                  display: '',
                  time: [{ time: 0 }],
                  id: continueId,
                  type: '',
                  name: '',
                  picture: '',
                  inBetweenSteps: true,
                  changeNickName: false,
                  changeProfilePicture: false,
                  identifier: added,
                },
              }}
            >
              <Provider
                closeModal={closeModal}
                existingId={integrations.map((p: any) => p.internalId)}
              />
            </IntegrationContext.Provider>
          </div>
        </div>
      </div>
    </div>
  );
};
