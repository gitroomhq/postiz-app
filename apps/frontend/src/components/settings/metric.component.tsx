'use client';

import { Select } from '@gitroom/react/form/select';
import React, { useCallback, useState } from 'react';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import timezones from 'timezones-list';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { setUserTimezone } from '@gitroom/frontend/components/layout/set.timezone';

const dateMetrics = [
  { label: 'AM:PM', value: 'US' },
  { label: '24 hours', value: 'GLOBAL' },
];

const MetricComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const user = useUser();
  const [currentMetric, setCurrentMetric] = useState(isUSCitizen());
  const [timezone, setTimezone] = useState(user?.timezoneName || '');

  const changeMetric = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setCurrentMetric(value === 'US');
    localStorage.setItem('isUS', value);
  };

  const changeTimezone = useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      setTimezone(value);
      setUserTimezone(value || null);

      await fetch('/user/timezone', {
        method: 'POST',
        body: JSON.stringify({ timezoneName: value || null }),
      });

      toaster.show(t('settings_updated', 'Settings updated'), 'success');
    },
    []
  );

  return (
    <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
      <div className="mt-[4px]">Date Metrics</div>
      <Select name="metric" disableForm={true} label="" onChange={changeMetric} value={currentMetric ? 'US' : 'GLOBAL'}>
        {dateMetrics.map((metric) => (
          <option
            key={metric.value}
            value={metric.value}
          >
            {metric.label}
          </option>
        ))}
      </Select>

      <div className="mt-[4px]">{t('current_timezone', 'Current Timezone')}</div>
      <Select
        name="timezone"
        disableForm={true}
        label=""
        onChange={changeTimezone}
        value={timezone}
      >
        <option value="">
          {t('timezone_auto', 'Auto (your browser timezone)')}
        </option>
        {timezones.map((metric) => (
          <option key={metric.tzCode} value={metric.tzCode}>
            {metric.label}
          </option>
        ))}
      </Select>
    </div>
  );
};

export default MetricComponent;
