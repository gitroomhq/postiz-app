'use client';

import { FC, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocalStorage } from '@mantine/hooks';
import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import { useTrack } from '@gitroom/react/helpers/use.track';

const UtmSaver: FC = () => {
  const query = useSearchParams();
  const [value, setValue] = useLocalStorage({ key: 'utm', defaultValue: '' });
  const searchParams = useSearchParams();
  const fireEvents = useFireEvents();
  const track = useTrack();

  useEffect(() => {
    if (searchParams.get('check')) {
      fireEvents('purchase');
      track(TrackEnum.StartTrial);
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
