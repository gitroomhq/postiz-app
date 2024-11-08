'use client';

import { FC, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocalStorage } from '@mantine/hooks';

const UtmSaver: FC = () => {
  const query = useSearchParams();
  const [value, setValue] = useLocalStorage({ key: 'utm', defaultValue: '' });

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
