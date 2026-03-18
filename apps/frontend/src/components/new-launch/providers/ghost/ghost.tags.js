'use client';
import { useCallback, useEffect, useState } from 'react';
import { ReactTags } from 'react-tag-autocomplete';
import { useSettings } from "../../../launches/helpers/use.values";
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
export const GhostTags = (props) => {
    const { name, label } = props;
    const form = useSettings();
    const { getValues } = useSettings();
    const customFunc = useCustomProviderFunction();
    const [suggestions, setSuggestions] = useState([]);
    const [tagValue, setTagValue] = useState([]);
    const onDelete = useCallback((tagIndex) => {
        const modify = tagValue.filter((_, i) => i !== tagIndex);
        setTagValue(modify);
        form.setValue(name, modify.map((t) => String(t.label)));
    }, [tagValue, name, form]);
    const onAddition = useCallback((newTag) => {
        const modify = [...tagValue, newTag];
        setTagValue(modify);
        form.setValue(name, modify.map((t) => String(t.label)));
    }, [tagValue, name, form]);
    useEffect(() => {
        // Fetch existing tags from Ghost
        customFunc.get('tags').then((data) => {
            setSuggestions(data || []);
        });
        // Load existing values
        const settings = getValues()[name];
        if (settings && Array.isArray(settings)) {
            setTagValue(settings.map((t) => ({ value: t, label: t })));
        }
    }, []);
    return (<div>
      <div className="text-[14px] mb-[6px]">{label}</div>
      <ReactTags allowNew suggestions={suggestions} selected={tagValue} onAdd={onAddition} onDelete={onDelete} placeholderText="Add a tag..."/>
    </div>);
};
//# sourceMappingURL=ghost.tags.js.map