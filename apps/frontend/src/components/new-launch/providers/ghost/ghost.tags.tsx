'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { ReactTags, Tag, TagSelected } from 'react-tag-autocomplete';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';

export const GhostTags: FC<{
  name: string;
  label: string;
  onChange: (event: {
    target: {
      value: string[];
      name: string;
    };
  }) => void;
}> = (props) => {
  const { name, label } = props;
  const form = useSettings();
  const { getValues } = useSettings();
  const [tagValue, setTagValue] = useState<TagSelected[]>([]);

  const onDelete = useCallback(
    (tagIndex: number) => {
      const modify = tagValue.filter((_, i) => i !== tagIndex);
      setTagValue(modify);
      form.setValue(
        name,
        modify.map((t) => String(t.label))
      );
    },
    [tagValue, name, form]
  );

  const onAddition = useCallback(
    (newTag: Tag) => {
      const modify = [...tagValue, newTag];
      setTagValue(modify);
      form.setValue(
        name,
        modify.map((t) => String(t.label))
      );
    },
    [tagValue, name, form]
  );

  useEffect(() => {
    const settings = getValues()[name];
    if (settings && Array.isArray(settings)) {
      setTagValue(
        settings.map((t: string) => ({ value: t, label: t }))
      );
    }
  }, []);

  return (
    <div>
      <div className="text-[14px] mb-[6px]">{label}</div>
      <ReactTags
        allowNew
        suggestions={[]}
        selected={tagValue}
        onAdd={onAddition}
        onDelete={onDelete}
        placeholderText="Add a tag..."
      />
    </div>
  );
};
