'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { ReactTags } from 'react-tag-autocomplete';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
export const WordpressCategories: FC<{
  name: string;
  label: string;
  onChange: (event: {
    target: {
      value: any[];
      name: string;
    };
  }) => void;
}> = (props) => {
  const { onChange, name, label } = props;
  const form = useSettings();
  const customFunc = useCustomProviderFunction();
  const [categories, setCategories] = useState<any[]>([]);
  const { getValues } = useSettings();
  const [selected, setSelected] = useState<any[]>([]);
  const onDelete = useCallback(
    (tagIndex: number) => {
      const modify = selected.filter((_, i) => i !== tagIndex);
      setSelected(modify);
      form.setValue(name, modify);
    },
    [selected, name, form]
  );
  const onAddition = useCallback(
    (newTag: any) => {
      const modify = [...selected, newTag];
      setSelected(modify);
      form.setValue(name, modify);
    },
    [selected, name, form]
  );
  useEffect(() => {
    customFunc.get('categories').then((data) => setCategories(data));
    const settings = getValues()[props.name];
    if (settings) {
      setSelected(settings);
    }
  }, []);
  if (!categories.length) {
    return null;
  }
  return (
    <div>
      <div className={`text-[14px] mb-[6px]`}>{label}</div>
      <ReactTags
        suggestions={categories}
        selected={selected}
        onAdd={onAddition}
        onDelete={onDelete}
      />
    </div>
  );
};
