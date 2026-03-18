'use client';
import { useCallback, useEffect, useState } from 'react';
import { ReactTags } from 'react-tag-autocomplete';
import { useSettings } from "../../../launches/helpers/use.values";
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
export const GhostAuthors = (props) => {
    const { name, label } = props;
    const form = useSettings();
    const { getValues } = useSettings();
    const customFunc = useCustomProviderFunction();
    const [suggestions, setSuggestions] = useState([]);
    const [tagValue, setTagValue] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const onDelete = useCallback((tagIndex) => {
        const modify = tagValue.filter((_, i) => i !== tagIndex);
        setTagValue(modify);
        form.setValue(name, modify.map((t) => String(t.value)));
    }, [tagValue, name, form]);
    const onAddition = useCallback((newTag) => {
        const modify = [...tagValue, newTag];
        setTagValue(modify);
        form.setValue(name, modify.map((t) => String(t.value)));
    }, [tagValue, name, form]);
    useEffect(() => {
        // Fetch available authors from Ghost
        customFunc.get('authors').then((data) => {
            setSuggestions(data || []);
            // Now that we have suggestions, restore existing values
            const settings = getValues()[name];
            if (settings && Array.isArray(settings)) {
                // Map author IDs back to their display names using suggestions
                const restoredTags = settings.map((id) => {
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
        return (<div>
        <div className="text-[14px] mb-[6px]">{label}</div>
        <div className="text-[12px] text-white/60">Loading authors...</div>
      </div>);
    }
    return (<div>
      <div className="text-[14px] mb-[6px]">{label}</div>
      <ReactTags suggestions={suggestions} selected={tagValue} onAdd={onAddition} onDelete={onDelete} placeholderText="Select an author..."/>
    </div>);
};
//# sourceMappingURL=ghost.authors.js.map