'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import ShortlinkPreferenceComponent from '@gitroom/frontend/components/settings/shortlink-preference.component';

const MetricComponent = dynamic(
  () => import('@gitroom/frontend/components/settings/metric.component'),
  {
    ssr: false,
  }
);

const DateFormatComponent = dynamic(
  () => import('@gitroom/frontend/components/settings/date.format.component'),
  {
    ssr: false,
  }
);

/** Workspace defaults only — email prefs live under Settings → Notifications. */
export const GlobalSettings = () => {
  return (
    <div className="mt-[18px] flex flex-col gap-[10px]">
      <MetricComponent />
      <DateFormatComponent />
      <ShortlinkPreferenceComponent />
    </div>
  );
};
