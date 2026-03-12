'use client';

import { FC, useEffect, useState } from 'react';
import { Select } from '@gitroom/react/form/select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
export const WordpressStatus: FC<{
  name: string;
  onChange: (event: {
    target: {
      value: string;
      name: string;
    };
  }) => void;
}> = (props) => {
  const { onChange, name } = props;
  const { getValues } = useSettings();
  const [currentStatus, setCurrentStatus] = useState<string>('publish');
  const onChangeInner = (event: {
    target: {
      value: string;
      name: string;
    };
  }) => {
    setCurrentStatus(event.target.value);
    onChange(event);
  };
  useEffect(() => {
    const settings = getValues()[props.name];
    if (settings) {
      setCurrentStatus(settings);
    }
  }, []);
  return (
    <Select
      name={name}
      label="Status"
      onChange={onChangeInner}
      value={currentStatus}
    >
      <option value="publish">Publish</option>
      <option value="draft">Draft</option>
      <option value="pending">Pending Review</option>
      <option value="private">Private</option>
    </Select>
  );
};
