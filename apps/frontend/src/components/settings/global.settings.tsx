'use client';

import React from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import dynamic from 'next/dynamic';

const MetricComponent = dynamic(
  () => import('@gitroom/frontend/components/settings/metric.component'),
  {
    ssr: false,
  }
);
export const GlobalSettings = () => {
  const t = useT();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('global_settings', 'Global Settings')}</h3>
      <MetricComponent />
      <div className="mt-[32px] text-[12px] text-textColor opacity-60">
        {t('app_version', 'App Version')}: <span className="font-mono">{appVersion}</span>
      </div>
    </div>
  );
};
