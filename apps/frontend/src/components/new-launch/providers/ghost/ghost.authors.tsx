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
  const [isInitialized, setIsInitialized] = useState(false);

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
    // Fetch available authors from Ghost
    customFunc.get('authors').then((data: GhostAuthor[]) => {
      setSuggestions(data || []);

      // Now that we have suggestions, restore existing values
      const settings = getValues()[name];
      if (settings && Array.isArray(settings)) {
        // Map author IDs back to their display names using suggestions
        const restoredTags = settings.map((id: string) => {
          const authorFound = (data || []).find((a) => a.value === id);
          return {
            value: id,
            label: authorFound ? authorFound.label : id,
          };
        });
        setTagValue(restoredTags);
      }
      setIsInitialized(true);
    });
  }, [name, customFunc, getValues, form]);

  if (!isInitialized) {
    return (
      <div>
        <div className="text-[14px] mb-[6px]">{label}</div>
        <div className="text-[12px] text-white/60">Loading authors...</div>
      </div>
    );
  }

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
