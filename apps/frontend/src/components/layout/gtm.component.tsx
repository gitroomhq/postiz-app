'use client';

import Script from 'next/script';
import { FC, useEffect } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export const TrialTracker: FC = () => {
  const user = useUser();
  const { googleAdsId, googleAdsTrialTracking } = useVariables();
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !user?.id ||
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      !window.gtag ||
      !googleAdsId ||
      !googleAdsTrialTracking
    )
      return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') !== 'true') return;
    const key = `gtm_start_trial_${user?.id}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    gtag('event', 'conversion', {
      send_to: `${googleAdsId}/${googleAdsTrialTracking}`,
      transaction_id: user.id,
    });
  }, [user]);
  return null;
};

export const GoogleTagManagerComponent: FC<{ gtmId?: string }> = ({
  gtmId,
}) => {
  if (!gtmId) {
    return null;
  }
  return (
    <>
      <Script src="/g.js" strategy="afterInteractive" />

      <Script id="google-ads-gtag" strategy="afterInteractive">
        {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gtmId}');
  `}
      </Script>
    </>
  );
};
