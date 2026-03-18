'use client';
import { useCallback, useEffect, useState } from 'react';
import { ReactTags } from 'react-tag-autocomplete';
import { useSettings } from "../../../launches/helpers/use.values";
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
export const GhostTiers = (props) => {
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
        // Fetch available tiers from Ghost (for paid content)
        customFunc.get('tiers').then((data) => {
            setSuggestions(data || []);
            // Restore existing values
            const settings = getValues()[name];
            if (settings && Array.isArray(settings)) {
                // Map tier IDs back to their display names using suggestions
                const restoredTags = settings.map((id) => {
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
        return (<div>
        <div className="text-[14px] mb-[6px]">{label}</div>
        <div className="text-[12px] text-white/60">Loading membership tiers...</div>
      </div>);
    }
    return (<div>
      <div className="text-[14px] mb-[6px]">{label}</div>
      <ReactTags suggestions={suggestions} selected={tagValue} onAdd={onAddition} onDelete={onDelete} placeholderText="Select tiers for paid content..."/>
      <div className="text-[12px] text-white/50 mt-[4px]">
        Restrict content to specific membership tiers (for paid content)
      </div>
    </div>);
};
//# sourceMappingURL=ghost.tiers.js.map