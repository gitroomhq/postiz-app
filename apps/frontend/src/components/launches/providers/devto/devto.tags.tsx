import { FC, useCallback, useEffect, useState } from 'react';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { ReactTags } from 'react-tag-autocomplete';
import interClass from '@gitroom/react/helpers/inter.font';

export const DevtoTags: FC<{
  name: string;
  label: string;
  onChange: (event: { target: { value: any[]; name: string } }) => void;
}> = (props) => {
  const { onChange, name, label } = props;
  const customFunc = useCustomProviderFunction();
  const [tags, setTags] = useState<any[]>([]);
  const { getValues } = useSettings();
  const [tagValue, setTagValue] = useState<any[]>([]);

  const onDelete = useCallback(
    (tagIndex: number) => {
      const modify = tagValue.filter((_, i) => i !== tagIndex);
      setTagValue(modify);
      onChange({ target: { value: modify, name } });
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
      onChange({ target: { value: modify, name } });
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

  if (!tags.length) {
    return null;
  }

  return (
    <div>
      <div className={`${interClass} text-[14px] mb-[6px]`}>{label}</div>
      <ReactTags
        suggestions={tags}
        selected={tagValue}
        onAdd={onAddition}
        onDelete={onDelete}
      />
    </div>
  );
};
