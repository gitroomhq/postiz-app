import React, { FC, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { IntegrationContext } from '@gitroom/frontend/components/launches/helpers/use.integration';
import dayjs from 'dayjs';
import useSWR, { useSWRConfig } from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { continueProviderList } from '@gitroom/frontend/components/new-launch/providers/continue-provider/list';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
export const Null: FC<{
  onSave: (data: any) => Promise<void>;
  existingId: string[];
}> = () => null;
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
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });
  const refreshList = useCallback(() => {
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
    <ContinueModal
      refreshList={refreshList}
      added={added}
      continueId={continueId}
      integrations={integrations.map((p: any) => p.internalId)}
      provider={Provider}
    />
  );
};

const ModalContent: FC<{
  continueId: string;
  added: any;
  provider: any;
  closeModal: () => void;
  integrations: string[];
}> = ({ continueId, added, provider: Provider, closeModal, integrations }) => {
  const fetch = useFetch();

  const onSave = useCallback(
    async (data: any) => {
      await fetch(`/integrations/provider/${continueId}/connect`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      closeModal();
    },
    [continueId, closeModal]
  );

  return (
    <IntegrationContext.Provider
      value={{
        date: newDayjs(),
        value: [],
        allIntegrations: [],
        integration: {
          editor: 'normal',
          additionalSettings: '',
          display: '',
          time: [
            {
              time: 0,
            },
          ],
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
      <Provider onSave={onSave} existingId={integrations} />
    </IntegrationContext.Provider>
  );
};

const ContinueModal: FC<{
  continueId: string;
  added: any;
  provider: any;
  integrations: string[];
  refreshList: () => void;
}> = (props) => {
  const modals = useModals();

  useEffect(() => {
    modals.openModal({
      title: 'Configure Channel',
      children: (close) => (
        <ModalContent
          {...props}
          closeModal={() => {
            props.refreshList();
            close();
          }}
        />
      ),
    });
  }, []);

  return null;
};
