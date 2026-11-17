'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export const FacebookAdsCallback = () => {
  const router = useRouter();
  const params = useSearchParams();
  const fetchApi = useFetch();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = params.get('code');
    const facebookError = params.get('error_description') || params.get('error');
    if (facebookError) {
      setError(facebookError);
      return;
    }
    if (!code) {
      setError('Facebook did not return an authorization code.');
      return;
    }
    fetchApi('/facebook-ads/connect', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || data.error || 'Could not store Facebook Ads token');
        }
        router.replace('/facebook-ads');
      })
      .catch((err) => setError(err.message));
  }, [fetchApi, params, router]);

  if (error) {
    return (
      <main style={{ maxWidth: 720, margin: '48px auto', padding: 24 }}>
        <h1>Facebook Ads connection failed</h1>
        <p role="alert">{error}</p>
        <p>
          <a href="/facebook-ads">Back to Facebook Ads</a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: '48px auto', padding: 24 }}>
      <h1>Connecting Facebook Ads...</h1>
      <p>Saving your Business Manager token.</p>
    </main>
  );
};