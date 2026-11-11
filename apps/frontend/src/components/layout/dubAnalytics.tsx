'use client';

import { useVariables } from '@gitroom/react/helpers/variable.context';
import { Analytics as DubAnalyticsIn } from '@dub/analytics/react';
import { getCookie } from 'react-use-cookie';
import { useDpaAllows } from '@gitroom/frontend/components/layout/user.context';

export const DubAnalytics = () => {
  const { dub } = useVariables();
  const allowed = useDpaAllows('dub');
  if (!dub || !allowed) return null;
  return (
    <DubAnalyticsIn
      domainsConfig={{
        refer: 'postiz.pro',
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
