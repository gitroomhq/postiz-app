'use client';

import { FC, useEffect, useState } from 'react';
import { Select } from '@gitroom/react/form/select';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
export const WordpressAuthor: FC<{
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
  const [authors, setAuthors] = useState([]);
  const { getValues } = useSettings();
  const [currentAuthor, setCurrentAuthor] = useState<string | undefined>();
  const onChangeInner = (event: {
    target: {
      value: string;
      name: string;
    };
  }) => {
    setCurrentAuthor(event.target.value);
    onChange({
      target: {
        value: event.target.value ? Number(event.target.value) : '',
        name: event.target.name,
      },
    } as any);
  };
  useEffect(() => {
    customFunc.get('authors').then((data) => setAuthors(data));
    const settings = getValues()[props.name];
    if (settings) {
      setCurrentAuthor(String(settings));
    }
  }, []);
  if (!authors.length) {
    return null;
  }
  return (
    <Select
      name={name}
      label="Author"
      onChange={onChangeInner}
      value={currentAuthor}
    >
      <option value="">{t('select_1', '--Select--')}</option>
      {authors.map((author: any) => (
        <option key={author.id} value={author.id}>
          {author.name}
        </option>
      ))}
    </Select>
  );
};
