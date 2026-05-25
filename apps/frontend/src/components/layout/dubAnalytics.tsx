'use client';

import { useVariables } from '@gitroom/react/helpers/variable.context';
import { Analytics as DubAnalyticsIn } from '@dub/analytics/react';
import { getCookie } from 'react-use-cookie';

export const DubAnalytics = () => {
  const { dub } = useVariables();
  if (!dub) return null;
  return (
    <DubAnalyticsIn
      domainsConfig={{
        refer: 'd3-analytics.vercel.app',
      }}
    />
  );
};

export const useDubClickId = () => {
  const { dub } = useVariables();
  if (!dub) return undefined;

  const dubCookie = getCookie('dub_partner_data', '{}');
  return JSON.parse(dubCookie)?.clickId || undefined;
};
