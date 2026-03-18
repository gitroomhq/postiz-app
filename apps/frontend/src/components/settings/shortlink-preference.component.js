'use client';
import { __awaiter } from "tslib";
import React, { useCallback, useEffect, useState } from 'react';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import useSWR from 'swr';
import { Select } from "../../../../../libraries/react-shared-libraries/src/form/select";
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const useShortlinkPreference = () => {
    const fetch = useFetch();
    const load = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch('/settings/shortlink')).json();
    }), []);
    return useSWR('shortlink-preference', load, {
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
    const [localValue, setLocalValue] = useState('ASK');
    // Sync local state with fetched data
    useEffect(() => {
        if (data === null || data === void 0 ? void 0 : data.shortlink) {
            setLocalValue(data.shortlink);
        }
    }, [data]);
    const handleChange = useCallback((event) => __awaiter(void 0, void 0, void 0, function* () {
        const newValue = event.target.value;
        // Update local state immediately
        setLocalValue(newValue);
        yield fetch('/settings/shortlink', {
            method: 'POST',
            body: JSON.stringify({ shortlink: newValue }),
        });
        mutate({ shortlink: newValue });
        toaster.show(t('settings_updated', 'Settings updated'), 'success');
    }), [fetch, mutate, toaster, t]);
    if (isLoading) {
        return (<div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
        <div className="animate-pulse">{t('loading', 'Loading...')}</div>
      </div>);
    }
    return (<div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
      <div className="mt-[4px]">
        {t('shortlink_settings', 'Shortlink Settings')}
      </div>
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex flex-col flex-1">
          <div className="text-[14px]">
            {t('shortlink_preference', 'Shortlink Preference')}
          </div>
          <div className="text-[12px] text-customColor18">
            {t('shortlink_preference_description', 'Control how URLs in your posts are handled. Shortlinks provide click statistics.')}
          </div>
        </div>
        <div className="w-[200px]">
          <Select name="shortlink" label="" disableForm={true} hideErrors={true} value={localValue} onChange={handleChange}>
            <option value="ASK">
              {t('shortlink_ask', 'Ask every time')}
            </option>
            <option value="YES">
              {t('shortlink_yes', 'Always shortlink')}
            </option>
            <option value="NO">
              {t('shortlink_no', 'Never shortlink')}
            </option>
          </Select>
        </div>
      </div>
    </div>);
};
export default ShortlinkPreferenceComponent;
//# sourceMappingURL=shortlink-preference.component.js.map