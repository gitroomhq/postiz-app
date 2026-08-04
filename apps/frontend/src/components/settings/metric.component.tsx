'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import timezones from 'timezones-list';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(timezone);

const MetricComponent = () => {
  const t = useT();
  const [currentMetric, setCurrentMetric] = useState(isUSCitizen());
  const [timezone, setTimezone] = useState(
    localStorage.getItem('timezone') || dayjs.tz.guess()
  );
  const changeMetric = (value: string) => {
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
  const dateMetrics = [
    { label: t('date_metric_ampm', 'AM:PM'), value: 'US' },
    { label: t('date_metric_24_hours', '24 hours'), value: 'GLOBAL' },
  ];
  return (
    <div className="rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)] p-[15px_16px] flex flex-col gap-[13px]">
      <div className="text-[13.5px] font-[600]">{t('date_metrics', 'Date Metrics')}</div>
      <div className="flex gap-[6px]">
        {dateMetrics.map((metric) => (
          <button
            type="button"
            key={metric.value}
            onClick={() => changeMetric(metric.value)}
            className={clsx(
              'h-[32px] px-[13px] rounded-pqSm text-[12.5px]',
              (currentMetric ? 'US' : 'GLOBAL') === metric.value
                ? 'bg-pqBrandSoft shadow-[inset_0_0_0_1px_var(--brand)] font-[600] text-pqText'
                : 'shadow-[inset_0_0_0_1px_var(--border)] text-pqMuted hover:bg-pqHover'
            )}
          >
            {metric.label}
          </button>
        ))}
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
