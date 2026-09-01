'use client';

import { Select } from '@gitroom/react/form/select';
import React, { useState } from 'react';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import timezones from 'timezones-list';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(timezone);

const MetricComponent = () => {
  const t = useT();
  const dateMetrics = [
    { label: t('am_pm', 'AM:PM'), value: 'US' },
    { label: t('twenty_four_hours', '24 hours'), value: 'GLOBAL' },
  ];
  const [currentMetric, setCurrentMetric] = useState(isUSCitizen());
  const [timezone, setTimezone] = useState(
    localStorage.getItem('timezone') || dayjs.tz.guess()
  );
  const changeMetric = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setCurrentMetric(value === 'US');
    localStorage.setItem('isUS', value);
  };

  const changeTimezone = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    console.log(value);
    setTimezone(value);
    localStorage.setItem('timezone', value);
    dayjs.tz.setDefault(value);
  };
  return (
    <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
      <div className="mt-[4px]">{t('date_metrics', 'Date Metrics')}</div>
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex flex-col flex-1">
          <div className="text-[14px]">{t('time_format', 'Time Format')}</div>
          <div className="text-[12px] text-customColor18">
            {t(
              'time_format_description',
              'Choose how times are displayed across the app'
            )}
          </div>
        </div>
        <div className="w-[200px]">
          <Select
            name="metric"
            disableForm={true}
            label=""
            hideErrors={true}
            onChange={changeMetric}
            value={currentMetric ? 'US' : 'GLOBAL'}
          >
            {dateMetrics.map((metric) => (
              <option
                key={metric.value}
                value={metric.value}
              >
                {metric.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/*<div className="mt-[4px]">Current Timezone</div>*/}
      {/*<Select*/}
      {/*  name="timezone"*/}
      {/*  disableForm={true}*/}
      {/*  label=""*/}
      {/*  onChange={changeTimezone}*/}
      {/*>*/}
      {/*  {timezones.map((metric) => (*/}
      {/*    <option*/}
      {/*      key={metric.name}*/}
      {/*      value={metric.tzCode}*/}
      {/*      selected={metric.tzCode === timezone}*/}
      {/*    >*/}
      {/*      {metric.label}*/}
      {/*    </option>*/}
      {/*  ))}*/}
      {/*</Select>*/}
    </div>
  );
};

export default MetricComponent;
