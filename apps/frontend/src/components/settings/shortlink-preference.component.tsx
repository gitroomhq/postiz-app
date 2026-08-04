'use client';

import React, { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

type ShortLinkPreference = 'ASK' | 'YES' | 'NO';

interface ShortlinkPreferenceResponse {
  shortlink: ShortLinkPreference;
}

export const useShortlinkPreference = () => {
  const fetch = useFetch();

  const load = useCallback(async () => {
    return (await fetch('/settings/shortlink')).json();
  }, []);

  return useSWR<ShortlinkPreferenceResponse>('shortlink-preference', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
};

const ShortlinkPreferenceComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, isLoading, mutate } = useShortlinkPreference();

  const [localValue, setLocalValue] = useState<ShortLinkPreference>('ASK');

  // Sync local state with fetched data
  useEffect(() => {
    if (data?.shortlink) {
      setLocalValue(data.shortlink);
    }
  }, [data]);

  const handleChange = useCallback(
    async (newValue: ShortLinkPreference) => {
      // Update local state immediately
      setLocalValue(newValue);

      await fetch('/settings/shortlink', {
        method: 'POST',
        body: JSON.stringify({ shortlink: newValue }),
      });

      mutate({ shortlink: newValue });
      toaster.show(t('settings_updated', 'Settings updated'), 'success');
    },
    [fetch, mutate, toaster, t]
  );

  const options: Array<{ value: ShortLinkPreference; label: string }> = [
    { value: 'ASK', label: t('shortlink_ask', 'Ask every time') },
    { value: 'YES', label: t('shortlink_yes', 'Always shortlink') },
    { value: 'NO', label: t('shortlink_no', 'Never shortlink') },
  ];

  if (isLoading) {
    return (
      <div className="rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)] p-[15px_16px]">
        <div className="animate-pulse">{t('loading', 'Loading...')}</div>
      </div>
    );
  }

  return (
    <div className="rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)] p-[15px_16px]">
      <div className="text-[13.5px] font-[600]">
        {t('shortlink_settings', 'Shortlink Settings')}
      </div>
      <div className="text-[12.5px] text-pqMuted mt-[3px]">
        {t(
          'shortlink_preference_description',
          'Control how URLs in your posts are handled. Shortlinks provide click statistics.'
        )}
      </div>
      <div className="flex flex-wrap gap-[8px] mt-[13px]">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            onClick={() => handleChange(option.value)}
            className={clsx(
              'h-[32px] px-[13px] rounded-pqSm text-[12.5px]',
              localValue === option.value
                ? 'bg-pqBrandSoft shadow-[inset_0_0_0_1px_var(--brand)] font-[600] text-pqText'
                : 'shadow-[inset_0_0_0_1px_var(--border)] text-pqMuted hover:bg-pqHover'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ShortlinkPreferenceComponent;

