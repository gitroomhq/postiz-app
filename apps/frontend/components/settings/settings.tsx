import { FC } from 'react';
import { SettingsInterface } from '@clickvote/interfaces';
import { Title } from '@tremor/react';
import { OrgForm } from "./OrgForm";
import { ApiKeys } from "./ApiKeys";
import { Members } from './Members';

export const Settings: FC<{ settings: SettingsInterface }> = (props) => {
  const { settings } = props;

  return (
    <div className="p-4">
      <Title className="bg-words-purple bg-clip-text text-transparent text-4xl">
        Settings
      </Title>

      <div className="flex flex-col gap-8">
        <div><OrgForm/></div>
        <div><Members/></div>
        <div><ApiKeys settings={settings}/></div>
      </div>
    </div>
  );
};
