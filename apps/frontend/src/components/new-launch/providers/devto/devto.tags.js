'use client';
import { useCallback, useEffect, useState } from 'react';
import { ReactTags } from 'react-tag-autocomplete';
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
import { useSettings } from "../../../launches/helpers/use.values";
export const DevtoTags = (props) => {
    const { onChange, name, label } = props;
    const form = useSettings();
    const customFunc = useCustomProviderFunction();
    const [tags, setTags] = useState([]);
    const { getValues } = useSettings();
    const [tagValue, setTagValue] = useState([]);
    const onDelete = useCallback((tagIndex) => {
        const modify = tagValue.filter((_, i) => i !== tagIndex);
        setTagValue(modify);
        form.setValue(name, modify);
    }, [tagValue, name, form]);
    const onAddition = useCallback((newTag) => {
        if (tagValue.length >= 4) {
            return;
        }
        const modify = [...tagValue, newTag];
        setTagValue(modify);
        form.setValue(name, modify);
    }, [tagValue, name, form]);
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
    return (<div>
      <div className={`text-[14px] mb-[6px]`}>{label}</div>
      <ReactTags suggestions={tags} selected={tagValue} onAdd={onAddition} onDelete={onDelete}/>
    </div>);
};
//# sourceMappingURL=devto.tags.js.map