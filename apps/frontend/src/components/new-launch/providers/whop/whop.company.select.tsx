'use client';

import { FC, useEffect, useState } from 'react';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { Select } from '@gitroom/react/form/select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const WhopCompanySelect: FC<{
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
  const [companies, setCompanies] = useState([]);
  const { getValues } = useSettings();
  const [currentCompany, setCurrentCompany] = useState<string | undefined>();
  const onChangeInner = (event: {
    target: {
      value: string;
      name: string;
    };
  }) => {
    setCurrentCompany(event.target.value);
    onChange(event);
  };
  useEffect(() => {
    customFunc.get('companies').then((data) => setCompanies(data));
    const settings = getValues()[props.name];
    if (settings) {
      setCurrentCompany(settings);
    }
  }, []);
  if (!companies.length) {
    return null;
  }
  return (
    <Select
      name={name}
      label="Select Company"
      onChange={onChangeInner}
      value={currentCompany}
    >
      <option value="">{t('select_1', '--Select--')}</option>
      {companies.map((company: any) => (
        <option key={company.id} value={company.id}>
          {company.name}
        </option>
      ))}
    </Select>
  );
};
