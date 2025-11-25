import React, { FC, Fragment, useCallback } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const StatisticsModal: FC<{
  postId: string;
}> = (props) => {
  const { postId } = props;
  const modals = useModals();
  const t = useT();
  const fetch = useFetch();
  const loadStatistics = useCallback(async () => {
    return (await fetch(`/posts/${postId}/statistics`)).json();
  }, [postId]);
  const closeAll = useCallback(() => {
    modals.closeAll();
  }, []);
  const { data, isLoading } = useSWR(
    `/posts/${postId}/statistics`,
    loadStatistics
  );
  return (
    <div className="relative">
      {isLoading ? (
        <div>{t('loading', 'Loading')}</div>
      ) : (
        <>
          {data.clicks.length === 0 ? (
            'No Results'
          ) : (
            <>
              <div className="grid grid-cols-3 mt-[20px]">
                <div className="bg-forth p-[4px] rounded-tl-lg">
                  {t('short_link', 'Short Link')}
                </div>
                <div className="bg-forth p-[4px]">
                  {t('original_link', 'Original Link')}
                </div>
                <div className="bg-forth p-[4px] rounded-tr-lg">
                  {t('clicks', 'Clicks')}
                </div>
                {data.clicks.map((p: any) => (
                  <Fragment key={p.short}>
                    <div className="p-[4px] py-[10px] bg-customColor6">
                      {p.short}
                    </div>
                    <div className="p-[4px] py-[10px] bg-customColor6">
                      {p.original}
                    </div>
                    <div className="p-[4px] py-[10px] bg-customColor6">
                      {p.clicks}
                    </div>
                  </Fragment>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
