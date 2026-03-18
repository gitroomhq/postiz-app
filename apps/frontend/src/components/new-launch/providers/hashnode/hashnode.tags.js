'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
import { useSettings } from "../../../launches/helpers/use.values";
import { ReactTags } from 'react-tag-autocomplete';
export const HashnodeTags = (props) => {
    var _a, _b;
    const { onChange, name, label } = props;
    const customFunc = useCustomProviderFunction();
    const [tags, setTags] = useState([]);
    const { getValues, formState: form } = useSettings();
    const [tagValue, setTagValue] = useState([]);
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
    }, [tagValue]);
    useEffect(() => {
        customFunc.get('tags').then((data) => setTags(data));
        const settings = getValues()[props.name] || [];
        if (settings) {
            setTagValue(settings);
        }
    }, []);
    const err = useMemo(() => {
        var _a, _b;
        if (!form || !form.errors[props === null || props === void 0 ? void 0 : props.name])
            return;
        return (_b = (_a = form === null || form === void 0 ? void 0 : form.errors) === null || _a === void 0 ? void 0 : _a[props === null || props === void 0 ? void 0 : props.name]) === null || _b === void 0 ? void 0 : _b.message;
    }, [(_b = (_a = form === null || form === void 0 ? void 0 : form.errors) === null || _a === void 0 ? void 0 : _a[props === null || props === void 0 ? void 0 : props.name]) === null || _b === void 0 ? void 0 : _b.message]);
    if (!tags.length) {
        return null;
    }
    return (<div>
      <div className={`text-[14px] mb-[6px]`}>{label}</div>
      <ReactTags suggestions={tags || []} selected={tagValue || []} onAdd={onAddition} onDelete={onDelete}/>
      <div className="text-red-400 text-[12px]">{err || <>&nbsp;</>}</div>
    </div>);
};
//# sourceMappingURL=hashnode.tags.js.map