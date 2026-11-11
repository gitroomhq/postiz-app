'use client';

import { FC } from 'react';
import Script from 'next/script';
import PlausibleProvider from 'next-plausible';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useDpaAllows } from '@gitroom/frontend/components/layout/user.context';
import { DubAnalytics } from '@gitroom/frontend/components/layout/dubAnalytics';
import { FacebookComponent } from '@gitroom/frontend/components/layout/facebook.component';
import { GoogleTagManagerComponent } from '@gitroom/frontend/components/layout/gtm.component';

const DataFastComponent: FC = () => {
  const { datafastWebsiteId } = useVariables();
  const allowed = useDpaAllows('datafast');
  if (!datafastWebsiteId || !allowed) {
    return null;
  }
  return (
    <Script
      data-website-id={datafastWebsiteId}
      data-domain="postiz.com"
      src="https://datafa.st/js/script.js"
      strategy="afterInteractive"
    />
  );
};

const PlausibleComponent: FC = () => {
  const { billingEnabled, isGeneral } = useVariables();
  const allowed = useDpaAllows('plausible');
  if (!billingEnabled || !allowed) {
    return null;
  }
  return (
    <PlausibleProvider domain={isGeneral ? 'postiz.com' : 'gitroom.com'} />
  );
};

export const ThirdPartyScripts: FC = () => {
  const { googleAdsId } = useVariables();
  return (
    <>
      <DataFastComponent />
      <DubAnalytics />
      <FacebookComponent />
      <GoogleTagManagerComponent gtmId={googleAdsId} />
      <PlausibleComponent />
    </>
  );
};
