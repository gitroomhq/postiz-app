'use client';

import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { ReactTags } from 'react-tag-autocomplete';

export const HashnodeTags: FC<{
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
  const customFunc = useCustomProviderFunction();
  const [tags, setTags] = useState<any[]>([]);
  const { getValues, formState: form } = useSettings();
  const [tagValue, setTagValue] = useState<any[]>([]);
  const onDelete = useCallback(
    (tagIndex: number) => {
      const modify = tagValue.filter((_, i) => i !== tagIndex);
      setTagValue(modify);
      onChange({
        target: {
          value: modify,
          name,
        },
      });
    },
    [tagValue]
  );
  const onAddition = useCallback(
    (newTag: any) => {
      if (tagValue.length >= 4) {
        return;
      }
      const modify = [...tagValue, newTag];
      setTagValue(modify);
      onChange({
        target: {
          value: modify,
          name,
        },
      });
    },
    [tagValue]
  );
  useEffect(() => {
    customFunc.get('tags').then((data) => setTags(data));
    const settings = getValues()[props.name];
    if (settings) {
      setTagValue(settings);
    }
  }, []);
  const err = useMemo(() => {
    if (!form || !form.errors[props?.name!]) return;
    return form?.errors?.[props?.name!]?.message! as string;
  }, [form?.errors?.[props?.name!]?.message]);
  if (!tags.length) {
    return null;
  }
  return (
    <div>
      <div className={`text-[14px] mb-[6px]`}>{label}</div>
      <ReactTags
        suggestions={tags}
        selected={tagValue}
        onAdd={onAddition}
        onDelete={onDelete}
      />
      <div className="text-red-400 text-[12px]">{err || <>&nbsp;</>}</div>
    </div>
  );
};
