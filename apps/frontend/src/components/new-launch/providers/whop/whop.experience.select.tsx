'use client';

import { FC, useEffect, useState } from 'react';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { Select } from '@gitroom/react/form/select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const WhopExperienceSelect: FC<{
  name: string;
  companyId: string | undefined;
  onChange: (event: {
    target: {
      value: string;
      name: string;
    };
  }) => void;
}> = (props) => {
  const { onChange, name, companyId } = props;
  const t = useT();
  const customFunc = useCustomProviderFunction();
  const [experiences, setExperiences] = useState([]);
  const { getValues } = useSettings();
  const [currentExperience, setCurrentExperience] = useState<
    string | undefined
  >();
  const onChangeInner = (event: {
    target: {
      value: string;
      name: string;
    };
  }) => {
    setCurrentExperience(event.target.value);
    onChange(event);
  };
  useEffect(() => {
    if (!companyId) {
      setExperiences([]);
      setCurrentExperience(undefined);
      return;
    }
    customFunc
      .get('experiences', { id: companyId })
      .then((data) => setExperiences(data));
  }, [companyId]);
  useEffect(() => {
    const settings = getValues()[name];
    if (settings) {
      setCurrentExperience(settings);
    }
  }, []);
  if (!companyId || !experiences.length) {
    return null;
  }
  return (
    <Select
      name={name}
      label="Select Forum"
      onChange={onChangeInner}
      value={currentExperience}
    >
      <option value="">{t('select_1', '--Select--')}</option>
      {experiences.map((experience: any) => (
        <option key={experience.id} value={experience.id}>
          {experience.name}
        </option>
      ))}
    </Select>
  );
};
