'use client';
import 'reflect-metadata';

import { FC, useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { AddEditModal } from '@gitroom/frontend/components/launches/add.edit.model';
import dayjs from 'dayjs';
import { usePathname } from 'next/navigation';

export const StandaloneModal: FC = () => {
  const fetch = useFetch();
  const params = usePathname();
  const load = useCallback(async (path: string) => {
    return (await (await fetch(path)).json()).integrations;
  }, []);

  const loadDate = useCallback(async () => {
    return (await (await fetch('/posts/find-slot')).json()).date;
  }, []);

  const {
    isLoading,
    data: integrations,
    mutate,
  } = useSWR('/integrations/list', load, {
    fallbackData: [],
  });

  const {
    isLoading: isLoading2,
    data,
  } = useSWR('/posts/find-slot', loadDate, {
    fallbackData: [],
  });

  if (isLoading || isLoading2) {
    return null;
  }

  return (
    <AddEditModal
      customClose={() => {
        window.parent.postMessage({ action: 'closeIframe' }, '*');
      }}
      padding="50px"
      mutate={() => {}}
      integrations={integrations}
      reopenModal={() => {}}
      allIntegrations={integrations}
      date={dayjs.utc(data).local()}
    />
  );
};
