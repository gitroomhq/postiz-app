'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import EmailNotificationsComponent from '@gitroom/frontend/components/settings/email-notifications.component';
import ShortlinkPreferenceComponent from '@gitroom/frontend/components/settings/shortlink-preference.component';

const MetricComponent = dynamic(
  () => import('@gitroom/frontend/components/settings/metric.component'),
  {
    ssr: false,
  }
);

export const GlobalSettings = () => {
  return (
    <div className="mt-[18px] flex flex-col gap-[10px]">
      <MetricComponent />
      <EmailNotificationsComponent />
      <ShortlinkPreferenceComponent />
    </div>
  );
};
