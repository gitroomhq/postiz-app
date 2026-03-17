'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { ReactTags, Tag, TagSelected } from 'react-tag-autocomplete';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';

interface GhostAuthor {
  value: string;
  label: string;
}

export const GhostAuthors: FC<{
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
  const [suggestions, setSuggestions] = useState<GhostAuthor[]>([]);
  const [tagValue, setTagValue] = useState<TagSelected[]>([]);

  const onDelete = useCallback(
    (tagIndex: number) => {
      const modify = tagValue.filter((_, i) => i !== tagIndex);
      setTagValue(modify);
      form.setValue(
        name,
        modify.map((t) => String(t.value))
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
        modify.map((t) => String(t.value))
      );
    },
    [tagValue, name, form]
  );

  useEffect(() => {
    // Fetch existing authors from Ghost
    customFunc.get('authors').then((data: GhostAuthor[]) => {
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
        suggestions={suggestions}
        selected={tagValue}
        onAdd={onAddition}
        onDelete={onDelete}
        placeholderText="Select an author..."
      />
    </div>
  );
};