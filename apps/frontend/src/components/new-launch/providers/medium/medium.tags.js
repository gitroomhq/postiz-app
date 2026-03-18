'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSettings } from "../../../launches/helpers/use.values";
import { ReactTags } from 'react-tag-autocomplete';
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const MediumTags = (props) => {
    const { onChange, name, label } = props;
    const { getValues } = useSettings();
    const [tagValue, setTagValue] = useState([]);
    const [suggestions, setSuggestions] = useState('');
    const t = useT();
    const onDelete = useCallback((tagIndex) => {
        const modify = tagValue.filter((_, i) => i !== tagIndex);
        setTagValue(modify);
        onChange({
            target: {
                value: modify,
                name,
            },
        });
    }, [tagValue]);
    const onAddition = useCallback((newTag) => {
        if (tagValue.length >= 3) {
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
    }, [tagValue]);
    useEffect(() => {
        const settings = getValues()[props.name];
        if (settings) {
            setTagValue(settings);
        }
    }, []);
    const suggestionsArray = useMemo(() => {
        return [
            ...tagValue,
            {
                label: suggestions,
                value: suggestions,
            },
        ].filter((f) => f.label);
    }, [suggestions, tagValue]);
    return (<div>
      <div className={`text-[14px] mb-[6px]`}>{label}</div>
      <ReactTags placeholderText={t('add_a_tag', 'Add a tag')} suggestions={suggestionsArray} selected={tagValue} onAdd={onAddition} onInput={setSuggestions} onDelete={onDelete}/>
    </div>);
};
//# sourceMappingURL=medium.tags.js.map