'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { ReactTags, Tag, TagSelected } from 'react-tag-autocomplete';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';

interface GhostTag {
  value: string;
  label: string;
}

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
  const customFunc = useCustomProviderFunction();
  const [suggestions, setSuggestions] = useState<GhostTag[]>([]);
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
    // Fetch existing tags from Ghost
    customFunc.get('tags').then((data: GhostTag[]) => {
      setSuggestions(data || []);
    });

    // Load existing values
    const settings = getValues()[name];
    if (settings && Array.isArray(settings)) {
      setTagValue(settings.map((t: string) => ({ value: t, label: t })));
    }
  }, []);

  return (
    <div>
      <div className="text-[14px] mb-[6px]">{label}</div>
      <ReactTags
        allowNew
        suggestions={suggestions}
        selected={tagValue}
        onAdd={onAddition}
        onDelete={onDelete}
        placeholderText="Add a tag..."
      />
    </div>
  );
};
