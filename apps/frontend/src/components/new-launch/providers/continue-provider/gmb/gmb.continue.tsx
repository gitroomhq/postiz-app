'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';

export const GmbContinue: FC<{
  onSave: (data: any) => Promise<void>;
  existingId: string[];
}> = (props) => {
  const { onSave, existingId } = props;
  const call = useCustomProviderFunction();
  const [location, setSelectedLocation] = useState<null | {
    id: string;
    accountName: string;
    locationName: string;
  }>(null);
  const t = useT();

  const loadPages = useCallback(async () => {
    try {
      const pages = await call.get('pages');
      return pages;
    } catch (e) {
      // Handle error silently
    }
  }, []);

  const setLocation = useCallback(
    (param: { id: string; accountName: string; locationName: string }) => () => {
      setSelectedLocation(param);
    },
    []
  );

  const { data, isLoading } = useSWR('load-gmb-locations', loadPages, {
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    revalidateOnReconnect: false,
    refreshInterval: 0,
  });

  const saveGmb = useCallback(async () => {
    await onSave(location);
  }, [onSave, location]);

  const filteredData = useMemo(() => {
    return (
      data?.filter((p: { id: string }) => !existingId.includes(p.id)) || []
    );
  }, [data, existingId]);

  if (!isLoading && !data?.length) {
    return (
      <div className="text-center flex flex-col justify-center items-center text-[18px] leading-[26px] h-[300px]">
        {t(
          'gmb_no_locations_found',
          "We couldn't find any business locations connected to your account."
        )}
        <br />
        <br />
        {t(
          'gmb_ensure_business_verified',
          'Please ensure your business is verified on Google My Business.'
        )}
        <br />
        <br />
        {t(
          'gmb_try_again',
          'Please close this dialog, delete the integration and try again.'
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[20px]">
      <div>{t('select_location', 'Select Business Location:')}</div>
      <div className="grid grid-cols-3 justify-items-center select-none cursor-pointer gap-[10px]">
        {filteredData?.map(
          (p: {
            id: string;
            name: string;
            accountName: string;
            locationName: string;
            picture: {
              data: {
                url: string;
              };
            };
          }) => (
            <div
              key={p.id}
              className={clsx(
                'flex flex-col w-full text-center gap-[10px] border border-input p-[10px] hover:bg-seventh rounded-[8px]',
                location?.id === p.id && 'bg-seventh border-primary'
              )}
              onClick={setLocation({
                id: p.id,
                accountName: p.accountName,
                locationName: p.locationName,
              })}
            >
              <div className="flex justify-center">
                {p.picture?.data?.url ? (
                  <img
                    className="w-[80px] h-[80px] object-cover rounded-[8px]"
                    src={p.picture.data.url}
                    alt={p.name}
                  />
                ) : (
                  <div className="w-[80px] h-[80px] bg-input rounded-[8px] flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="text-sm font-medium">{p.name}</div>
            </div>
          )
        )}
      </div>
      <div>
        <Button disabled={!location} onClick={saveGmb}>
          {t('save', 'Save')}
        </Button>
      </div>
    </div>
  );
};

