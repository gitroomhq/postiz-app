import { useThirdParty } from '@gitroom/frontend/components/third-parties/third-party.media';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';

export const useThirdPartySubmit = () => {
  const thirdParty = useThirdParty();
  const fetch = useFetch();

  return useCallback(async (data?: any) => {
    if (!thirdParty.id) {
      return;
    }

    const response = await fetch(`/third-party/${thirdParty.id}/submit`, {
      body: JSON.stringify(data),
      method: 'POST',
    });

    return response.json();
  }, []);
};

export const useThirdPartyFunction = (type: 'EVERYTIME' | 'ONCE') => {
  const thirdParty = useThirdParty();
  const data = useRef<any>(undefined);
  const fetch = useFetch();

  return useCallback(
    async (functionName: string, sendData?: any) => {
      if (data.current && type === 'ONCE') {
        return data.current;
      }

      data.current = await (
        await fetch(`/third-party/function/${thirdParty.id}/${functionName}`, {
          ...(data ? { body: JSON.stringify(sendData) } : {}),
          method: 'POST',
        })
      ).json();

      return data.current;
    },
    [thirdParty, data]
  );
};

export const useThirdPartyFunctionSWR = (
  type: 'SWR' | 'LOAD_ONCE',
  functionName: string,
  data?: any
) => {
  const thirdParty = useThirdParty();
  const fetch = useFetch();

  const callBack = useCallback(
    async (functionName: string, data?: any) => {
      return (
        await fetch(`/third-party/function/${thirdParty.id}/${functionName}`, {
          ...(data ? { body: JSON.stringify(data) } : {}),
          method: 'POST',
        })
      ).json();
    },
    [thirdParty]
  );

  return useSWR<any>(
    `function-${thirdParty.id}-${functionName}`,
    () => {
      // @ts-ignore
      return callBack(functionName, { ...data });
    },
    {
      ...(type === 'LOAD_ONCE'
        ? {
            revalidateOnMount: true,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            refreshInterval: 0,
            refreshWhenHidden: false,
            refreshWhenOffline: false,
            revalidateIfStale: false,
          }
        : {}),
    }
  );
};
