'use client';

import { GithubComponent } from '@gitroom/frontend/components/settings/github.component';
import { useCallback, useEffect } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { TeamsComponent } from '@gitroom/frontend/components/settings/teams.component';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useRouter } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export const SettingsComponent = () => {
  const {isGeneral} = useVariables();
  const user = useUser();
  const router = useRouter();

  const fetch = useFetch();

  const load = useCallback(async (path: string) => {
    const { github } = await (await fetch('/settings/github')).json();
    if (!github) {
      return false;
    }

    const emptyOnes = github.find((p: { login: string }) => !p.login);
    const { organizations } = emptyOnes
      ? await (await fetch(`/settings/organizations/${emptyOnes.id}`)).json()
      : { organizations: [] };

    return { github, organizations };
  }, []);

  const { isLoading: isLoadingSettings, data: loadAll } = useSWR(
    'load-all',
    load
  );

  useEffect(() => {
    if (!isLoadingSettings && !loadAll) {
      router.push('/');
    }
  }, [loadAll, isLoadingSettings]);

  if (isLoadingSettings) {
    return <LoadingComponent />;
  }

  if (!loadAll) {
    return null;
  }

  return (
    <div className="flex flex-col gap-[68px]">
      {!isGeneral && (
        <div className="flex flex-col">
          <h3 className="text-[20px]">Your Git Repository</h3>
          <div className="text-customColor18 mt-[4px]">
            Connect your GitHub repository to receive updates and analytics
          </div>
          <GithubComponent
            github={loadAll.github}
            organizations={loadAll.organizations}
          />
          {/*<div className="flex gap-[5px]">*/}
          {/*  <div>*/}
          {/*    <Checkbox disableForm={true} checked={true} name="Send Email" />*/}
          {/*  </div>*/}
          {/*  <div>Show news with everybody in Gitroom</div>*/}
          {/*</div>*/}
        </div>
      )}
      {!!user?.tier?.team_members && <TeamsComponent />}
    </div>
  );
};
