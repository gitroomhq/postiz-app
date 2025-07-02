'use client';

import { useVariables } from '@gitroom/react/helpers/variable.context';
import Script from 'next/script';
export const useTolt = () => {
  return () => {
    // @ts-ignore
    return window?.tolt_referral || '';
  };
};
export const ToltScript = () => {
  const { tolt } = useVariables();
  if (!tolt) return null;
  return (
    <Script async={true} src="https://cdn.tolt.io/tolt.js" data-tolt={tolt} />
  );
};
