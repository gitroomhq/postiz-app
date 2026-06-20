'use client';

import { FC, useEffect, useState } from 'react';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { Select } from '@gitroom/react/form/select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const SkoolGroupSelect: FC<{
  name: string;
  onChange: (event: {
    target: {
      value: string;
      name: string;
    };
  }) => void;
}> = (props) => {
  const { onChange, name } = props;
  const t = useT();
  const customFunc = useCustomProviderFunction();
  const [groups, setGroups] = useState([]);
  const { getValues } = useSettings();
  const [currentGroup, setCurrentGroup] = useState<string | undefined>();
  const onChangeInner = (event: {
    target: {
      value: string;
      name: string;
    };
  }) => {
    setCurrentGroup(event.target.value);
    onChange(event);
  };
  useEffect(() => {
    customFunc.get('groups').then((data) => setGroups(data));
    const settings = getValues()[props.name];
    if (settings) {
      setCurrentGroup(settings);
    }
  }, []);
  if (!groups.length) {
    return null;
  }
  return (
    <Select
      name={name}
      label="Select Group"
      onChange={onChangeInner}
      value={currentGroup}
    >
      <option value="">{t('select_1', '--Select--')}</option>
      {groups.map((group: any) => (
        <option key={group.id} value={group.id}>
          {group.name}
        </option>
      ))}
    </Select>
  );
};
