'use client';

import { Checkbox } from '@gitroom/react/form/checkbox';
import { GithubComponent } from '@gitroom/frontend/components/settings/github.component';
import { FC } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { TeamsComponent } from '@gitroom/frontend/components/settings/teams.component';

export const SettingsComponent: FC<{
  organizations: Array<{ login: string; id: string }>;
  github: Array<{ id: string; login: string }>;
}> = (props) => {
  const { github, organizations } = props;
  const user = useUser();

  return (
    <div className="flex flex-col gap-[68px]">
      <div className="flex flex-col">
        <h3 className="text-[20px]">Your Git Repository</h3>
        <div className="text-[#AAA] mt-[4px]">
          Connect your GitHub repository to receive updates and analytics
        </div>
        <GithubComponent github={github} organizations={organizations} />
        {/*<div className="flex gap-[5px]">*/}
        {/*  <div>*/}
        {/*    <Checkbox disableForm={true} checked={true} name="Send Email" />*/}
        {/*  </div>*/}
        {/*  <div>Show news with everybody in Gitroom</div>*/}
        {/*</div>*/}
      </div>
      {!!user?.tier.team_members && <TeamsComponent />}
    </div>
  );
};
