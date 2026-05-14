'use client';

import Script from 'next/script';
import { FC, useEffect } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';

export const TrialTracker: FC = () => {
  const user = useUser();
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (typeof window === 'undefined' || !user?.id || !window.dataLayer) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') !== 'true') return;
    const check = params.get('check') || 'unknown';
    const key = `gtm_start_trial_${user?.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    window.dataLayer = window.dataLayer || [];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    window.dataLayer.push({ event: 'start_trial', check });
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
