'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';

export const YoutubeContinue: FC<{
  onSave: (data: any) => Promise<void>;
  existingId: string[];
}> = (props) => {
  const { onSave, existingId } = props;
  const call = useCustomProviderFunction();
  const [channel, setSelectedChannel] = useState<null | { id: string }>(null);
  const t = useT();

  const loadChannels = useCallback(async () => {
    try {
      const channels = await call.get('pages');
      return channels;
    } catch (e) {
      // Handle error silently
    }
  }, []);

  const setChannel = useCallback(
    (param: { id: string }) => () => {
      setSelectedChannel(param);
    },
    []
  );

  const { data, isLoading } = useSWR('load-youtube-channels', loadChannels, {
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    revalidateOnReconnect: false,
    refreshInterval: 0,
  });

  const saveYoutube = useCallback(async () => {
    await onSave(channel);
  }, [onSave, channel]);

  const filteredData = useMemo(() => {
    return (
      data?.filter((p: { id: string }) => !existingId.includes(p.id)) || []
    );
  }, [data, existingId]);

  if (!isLoading && !data?.length) {
    return (
      <div className="text-center flex flex-col justify-center items-center text-[18px] leading-[26px] h-[300px]">
        {t(
          'youtube_no_channels_found',
          "We couldn't find any YouTube channels connected to your account."
        )}
        <br />
        <br />
        {t(
          'youtube_ensure_channel_exists',
          'Please ensure you have a YouTube channel created.'
        )}
        <br />
        <br />
        {t(
          'youtube_try_again',
          'Please close this dialog, delete the integration and try again.'
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[20px]">
      <div>{t('select_channel', 'Select YouTube Channel:')}</div>
      <div className="grid grid-cols-3 justify-items-center select-none cursor-pointer gap-[10px]">
        {filteredData?.map(
          (p: {
            id: string;
            name: string;
            username: string;
            subscriberCount: string;
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
                channel?.id === p.id && 'bg-seventh border-primary'
              )}
              onClick={setChannel({ id: p.id })}
            >
              <div className="flex justify-center">
                {p.picture?.data?.url ? (
                  <img
                    className="w-[80px] h-[80px] object-cover rounded-full"
                    src={p.picture.data.url}
                    alt={p.name}
                  />
                ) : (
                  <div className="w-[80px] h-[80px] bg-input rounded-full flex items-center justify-center">
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
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="text-sm font-medium">{p.name}</div>
              {p.username && (
                <div className="text-xs text-gray-500">{p.username}</div>
              )}
              {p.subscriberCount && (
                <div className="text-xs text-gray-400">
                  {parseInt(p.subscriberCount).toLocaleString()} subscribers
                </div>
              )}
            </div>
          )
        )}
      </div>
      <div>
        <Button disabled={!channel} onClick={saveYoutube}>
          {t('save', 'Save')}
        </Button>
      </div>
    </div>
  );
};

