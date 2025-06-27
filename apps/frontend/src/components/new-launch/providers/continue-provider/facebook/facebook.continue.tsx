'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
export const FacebookContinue: FC<{
  closeModal: () => void;
  existingId: string[];
}> = (props) => {
  const { closeModal, existingId } = props;
  const call = useCustomProviderFunction();
  const { integration } = useIntegration();
  const [page, setSelectedPage] = useState<null | string>(null);
  const fetch = useFetch();
  const loadPages = useCallback(async () => {
    try {
      const pages = await call.get('pages');
      return pages;
    } catch (e) {
      closeModal();
    }
  }, []);
  const setPage = useCallback(
    (id: string) => () => {
      setSelectedPage(id);
    },
    []
  );
  const { data, isLoading } = useSWR('load-pages', loadPages, {
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    revalidateOnReconnect: false,
    refreshInterval: 0,
  });
  const t = useT();

  const saveInstagram = useCallback(async () => {
    await fetch(`/integrations/facebook/${integration?.id}`, {
      method: 'POST',
      body: JSON.stringify({
        page,
      }),
    });
    closeModal();
  }, [integration, page]);
  const filteredData = useMemo(() => {
    return (
      data?.filter((p: { id: string }) => !existingId.includes(p.id)) || []
    );
  }, [data]);
  if (!isLoading && !data?.length) {
    return (
      <div className="text-center flex justify-center items-center text-[18px] leading-[50px] h-[300px]">
        {t(
          'we_couldn_t_find_any_business_connected_to_the_selected_pages',
          "We couldn't find any business connected to the selected pages."
        )}
        <br />
        {t(
          'we_recommend_you_to_connect_all_the_pages_and_all_the_businesses',
          'We recommend you to connect all the pages and all the businesses.'
        )}
        <br />
        {t(
          'please_close_this_dialog_delete_your_integration_and_add_a_new_channel_again',
          'Please close this dialog, delete your integration and add a new channel\n        again.'
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[20px]">
      <div>{t('select_page', 'Select Page:')}</div>
      <div className="grid grid-cols-3 justify-items-center select-none cursor-pointer">
        {filteredData?.map(
          (p: {
            id: string;
            username: string;
            name: string;
            picture: {
              data: {
                url: string;
              };
            };
          }) => (
            <div
              key={p.id}
              className={clsx(
                'flex flex-col w-full text-center gap-[10px] border border-input p-[10px] hover:bg-seventh',
                page === p.id && 'bg-seventh'
              )}
              onClick={setPage(p.id)}
            >
              <div>
                <img
                  className="w-full"
                  src={p.picture.data.url}
                  alt="profile"
                />
              </div>
              <div>{p.name}</div>
            </div>
          )
        )}
      </div>
      <div>
        <Button disabled={!page} onClick={saveInstagram}>
          {t('save', 'Save')}
        </Button>
      </div>
    </div>
  );
};
