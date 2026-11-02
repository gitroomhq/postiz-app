'use client';

import { FC, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocalStorage } from '@mantine/hooks';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';

const UtmSaver: FC = () => {
  const query = useSearchParams();
  const [value, setValue] = useLocalStorage({ key: 'utm', defaultValue: '' });
  const searchParams = useSearchParams();
  const fireEvents = useFireEvents();

  // the Facebook pixel StartTrial is sent by the backend once Stripe confirms
  // the trial, firing it here as well would count it twice
  useEffect(() => {
    if (searchParams.get('check')) {
      fireEvents('purchase');
    }
  }, []);

  useEffect(() => {
    const landingUrl = localStorage.getItem('landingUrl');
    if (landingUrl) {
      return;
    }

    localStorage.setItem('landingUrl', window.location.href);
    localStorage.setItem('referrer', document.referrer);
  }, []);

  useEffect(() => {
    const utm = query.get('utm_source') || query.get('utm') || query.get('ref');
    if (utm && !value) {
      setValue(utm);
    }
  }, [query, value]);

  return <></>;
};

export const useUtmUrl = () => {
  const [value] = useLocalStorage({ key: 'utm', defaultValue: '' });
  return value || '';
};
export default UtmSaver;
