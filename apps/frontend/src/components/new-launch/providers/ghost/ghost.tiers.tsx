'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { ReactTags, Tag, TagSelected } from 'react-tag-autocomplete';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';

interface GhostTier {
  value: string;
  label: string;
}

export const GhostTiers: FC<{
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
  const [suggestions, setSuggestions] = useState<GhostTier[]>([]);
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
    // Fetch available tiers from Ghost (for paid content)
    customFunc.get('tiers').then((data: GhostTier[]) => {
      setSuggestions(data || []);

      // Restore existing values
      const settings = getValues()[name];
      if (settings && Array.isArray(settings)) {
        // Map tier IDs back to their display names using suggestions
        const restoredTags = settings.map((id: string) => {
          const tierFound = (data || []).find((t) => t.value === id);
          return {
            value: id,
            label: tierFound ? tierFound.label : id,
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
        <div className="text-[12px] text-white/60">Loading membership tiers...</div>
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
        placeholderText="Select tiers for paid content..."
      />
      <div className="text-[12px] text-white/50 mt-[4px]">
        Restrict content to specific membership tiers (for paid content)
      </div>
    </div>
  );
};
