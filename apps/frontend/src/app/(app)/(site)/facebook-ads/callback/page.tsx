import { Suspense } from 'react';
import { FacebookAdsCallback } from '@gitroom/frontend/components/facebook-ads/facebook.ads.callback';

export const dynamic = 'force-dynamic';

export default function FacebookAdsCallbackPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Connecting Facebook Ads...</main>}>
      <FacebookAdsCallback />
    </Suspense>
  );
}