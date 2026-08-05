'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';

const MetricComponent = () => {
  const t = useT();
  const toaster = useToaster();
  const [currentMetric, setCurrentMetric] = useState(isUSCitizen());
  const changeMetric = (value: string) => {
    const nextIsUS = value === 'US';
    if (nextIsUS === currentMetric) {
      return;
    }
    setCurrentMetric(nextIsUS);
    localStorage.setItem('isUS', value);
    // Client-only preference (no API) — same success toast as server-backed
    // Global Settings controls so the owner gets clear persist feedback.
    toaster.show(t('settings_updated', 'Settings updated'), 'success');
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
    </div>
  );
};

export default MetricComponent;
