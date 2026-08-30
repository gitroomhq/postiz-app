'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Slider } from '@gitroom/react/form/slider';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface MediaSettings {
  skipMediaRescale: boolean;
}

export const useMediaSettings = () => {
  const fetch = useFetch();

  const load = useCallback(async () => {
    return (await fetch('/user/media-settings')).json();
  }, []);

  return useSWR<MediaSettings>('media-settings', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
};

const MediaSettingsComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, isLoading, mutate } = useMediaSettings();

  const [localSettings, setLocalSettings] = useState<MediaSettings>({
    skipMediaRescale: false,
  });

  // Keep a ref to always have the latest state
  const settingsRef = useRef(localSettings);
  settingsRef.current = localSettings;

  // Sync local state with fetched data
  useEffect(() => {
    if (data) {
      setLocalSettings(data);
    }
  }, [data]);

  const updateSetting = useCallback(
    async (key: keyof MediaSettings, value: boolean) => {
      // Use ref to get the latest state
      const currentSettings = settingsRef.current;
      const newData = {
        ...currentSettings,
        [key]: value,
      };

      // Update local state immediately
      setLocalSettings(newData);

      await fetch('/user/media-settings', {
        method: 'POST',
        body: JSON.stringify(newData),
      });

      mutate();
      toaster.show(t('settings_updated', 'Settings updated'), 'success');
    },
    [mutate]
  );

  const handleSkipMediaRescaleChange = useCallback(
    (value: 'on' | 'off') => {
      updateSetting('skipMediaRescale', value === 'on');
    },
    [updateSetting]
  );

  if (isLoading) {
    return (
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
        <div className="animate-pulse">
          {t('loading', 'Loading...')}
        </div>
      </div>
    );
  }

  return (
    <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
      <div className="mt-[4px]">
        {t('media_settings', 'Media Settings')}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-[14px]">
            {t('skip_media_rescale', 'Skip Media Rescale')}
          </div>
          <div className="text-[12px] text-customColor18">
            {t(
              'skip_media_rescale_description',
              'On the web interface all uploaded media is rescaled to 1080p; turn this on to skip rescaling and keep the original file'
            )}
          </div>
        </div>
        <Slider
          value={localSettings.skipMediaRescale ? 'on' : 'off'}
          onChange={handleSkipMediaRescaleChange}
          fill={true}
        />
      </div>
    </div>
  );
};

export default MediaSettingsComponent;
