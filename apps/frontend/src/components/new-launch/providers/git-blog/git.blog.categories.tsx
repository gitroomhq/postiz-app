'use client';

import { FC, useEffect, useState } from 'react';
import { MultiSelect } from '@gitroom/react/form/multi.select';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';

// Lists the category files in the connected repository. Values are the
// category names, which is what the site's front matter stores.
export const GitBlogCategories: FC<{
  name: string;
  label: string;
  onChange: (event: {
    target: {
      value: string[];
      name: string;
    };
  }) => void;
}> = (props) => {
  const { name, label, onChange } = props;
  const customFunc = useCustomProviderFunction();
  const form = useSettings();
  const { getValues } = form;
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selected, setSelected] = useState<Array<string | number>>([]);

  useEffect(() => {
    customFunc.get('categoriesList').then((data) => setCategories(data || []));
    const settings = getValues()[name];
    if (Array.isArray(settings)) {
      setSelected(settings);
    }
  }, []);

  const onChangeInner = (value: Array<string | number>) => {
    const names = value.map((current) => String(current));
    setSelected(names);
    form.setValue(name, names, { shouldValidate: true });
    onChange?.({ target: { name, value: names } });
  };

  if (!categories.length) {
    return null;
  }

  return (
    <MultiSelect
      name={name}
      label={label}
      value={selected}
      onChange={onChangeInner}
      options={categories.map((category) => ({
        label: category.name,
        value: category.id,
      }))}
    />
  );
};
