'use client';

import { FC, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

const getAttribution = (): Record<string, string> => {
  try {
    const saved = JSON.parse(localStorage.getItem('attribution') || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved)
      ? saved
      : {};
  } catch (err) {
    return {};
  }
};

// URL parameters of the attribution tools configured on the backend, only
// asked for when the address has a query to look in
const useAttributionParams = (hasQuery: boolean) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await (await fetch('/auth/attribution')).json())
      .params as string[];
  }, []);

  return useSWR(hasQuery ? 'attribution-params' : null, load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
};

// Attribution tools (LeadJourney, ...) send visitors to the app with a click
// id in the URL. Keep it until sign-up (a social sign-up leaves the app and
// comes back) and take it out of the address bar, so a copied or bookmarked
// link doesn't pass this visit on to someone else. Mounted on the auth pages:
// signed-out visitors always land there, the proxy keeps the query string.
export const AttributionComponent: FC = () => {
  const searchParams = useSearchParams();
  const { data: params } = useAttributionParams(!!searchParams.toString());

  useEffect(() => {
    const url = new URL(window.location.href);
    const found = (params || []).filter((param) => url.searchParams.get(param));
    if (!found.length) {
      return;
    }

    const attribution = getAttribution();
    for (const param of found) {
      attribution[param] = url.searchParams.get(param)!;
      url.searchParams.delete(param);
    }

    try {
      localStorage.setItem('attribution', JSON.stringify(attribution));
    } catch (err) {
      // storage is blocked (strict private browsing), the sign-up goes without it
    }

    window.history.replaceState(null, '', url.toString());
  }, [params, searchParams]);

  return null;
};

// Click ids to send with the sign-up
export const useAttribution = () => {
  return useCallback(() => getAttribution(), []);
};
