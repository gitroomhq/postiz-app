'use client';

import useSWR from 'swr';
import { ContextWrapper } from '@chaolaolo/frontend/components/layout/user.context';
import { ReactNode, useCallback } from 'react';
import { useFetch } from '@chaolaolo/helpers/utils/custom.fetch';
import { Toaster } from '@chaolaolo/react/toaster/toaster';
import { MantineWrapper } from '@chaolaolo/react/helpers/mantine.wrapper';
import { useVariables } from '@chaolaolo/react/helpers/variable.context';
import { CopilotKit } from '@copilotkit/react-core';
export const PreviewWrapper = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();
  const { backendUrl } = useVariables();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: user } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });
  return (
    <ContextWrapper user={user}>
      <CopilotKit
        credentials="include"
        runtimeUrl={backendUrl + '/copilot/chat'}
      >
        <MantineWrapper>
          <Toaster />
          {children}
        </MantineWrapper>
      </CopilotKit>
    </ContextWrapper>
  );
};
