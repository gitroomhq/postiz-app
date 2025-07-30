'use client';

import useSWR from 'swr';
import { ContextWrapper } from '@gitroom/frontend/components/layout/user.context';
import { ReactNode, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { CopilotKit } from '@copilotkit/react-core';
export const PreviewWrapper = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();
  const { backendUrl } = useVariables();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  
  const loadUserWithPersonal = useCallback(async () => {
    const [userResponse, personalResponse] = await Promise.all([
      fetch('/user/self'),
      fetch('/user/personal')
    ]);
    
    const user = await userResponse.json();
    const personal = await personalResponse.json();
    
    return {
      ...user,
      name: personal?.name || user?.name || '',
      bio: personal?.bio || user?.bio || '',
      picture: personal?.picture || user?.picture || null,
    };
  }, []);

  const { data: user, mutate } = useSWR('/user/self-with-personal', loadUserWithPersonal, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });

  return (
    <ContextWrapper user={user} userMutate={mutate}>
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
