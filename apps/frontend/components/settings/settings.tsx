import { FC } from 'react';
import { Title } from '@tremor/react';
import { SettingsInterface } from '@clickvote/interfaces';
import { SettingsOrg } from '@clickvote/frontend/components/settings/settings.org';
import { SettingsAPIKeys } from './settings.api.keys';
import { SettingsOrgMembers } from './settings.org.members';

export const Settings: FC<{ settings: SettingsInterface }> = (props) => {
  const { settings } = props;

  return (
    <div className="p-4">
      <Title className="bg-words-purple bg-clip-text text-transparent text-4xl">
        Settings
      </Title>
      <SettingsOrg />
      <SettingsOrgMembers />
      <SettingsAPIKeys settings={settings} />
    </div>
  );
};
