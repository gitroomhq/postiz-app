'use client';

import { FC, useEffect, useState } from 'react';
import { Select } from '@gitroom/react/form/select';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';

export const SelectLabel: FC<{
  name: string;
  onChange: (event: {
    target: {
      value: { value: string; label: string } | undefined;
      name: string;
    };
  }) => void;
}> = (props) => {
  const { onChange, name } = props;
  const t = useT();
  const customFunc = useCustomProviderFunction();
  const [labels, setLabels] = useState<{ value: string; label: string }[]>([]);
  const { getValues } = useSettings();
  const [currentLabel, setCurrentLabel] = useState<string | undefined>();

  const onChangeInner = (event: {
    target: {
      value: string;
      name: string;
    };
  }) => {
    setCurrentLabel(event.target.value);
    const selectedLabel = labels.find((l) => l.value === event.target.value);
    onChange({
      target: {
        name,
        value: selectedLabel,
      },
    });
  };

  useEffect(() => {
    customFunc.get('getLabels').then((data) => {
        if (Array.isArray(data)) {
            setLabels(data);
        }
    });
    
    // Handle initial value if it exists
    const settings = getValues()[props.name];
    if (settings?.value) {
      setCurrentLabel(settings.value);
    }
  }, []);

  if (!labels.length) {
    return null;
  }

  return (
    <Select
      name={name}
      label="Select Label"
      onChange={onChangeInner}
      value={currentLabel}
    >
      <option value="">{t('select_default', 'Default Label')}</option>
      {labels.map((l) => (
        <option key={l.value} value={l.value}>
          {l.label}
        </option>
      ))}
    </Select>
  );
};

