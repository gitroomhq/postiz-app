'use client';
import { useEffect, useState } from 'react';
import { useSettings } from "../../../launches/helpers/use.values";
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
export const GhostNewsletters = (props) => {
    const { name, label } = props;
    const form = useSettings();
    const { getValues } = useSettings();
    const customFunc = useCustomProviderFunction();
    const [newsletters, setNewsletters] = useState([]);
    const [selectedValue, setSelectedValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        // Fetch available newsletters from Ghost
        customFunc.get('newsletters').then((data) => {
            setNewsletters(data || []);
            setIsLoading(false);
            // Restore existing value
            const settings = getValues()[name];
            if (settings && typeof settings === 'string') {
                setSelectedValue(settings);
            }
        });
    }, [name, customFunc, getValues, form]);
    const handleChange = (e) => {
        const newValue = e.target.value;
        setSelectedValue(newValue);
        form.setValue(name, newValue);
    };
    if (isLoading) {
        return (<div>
        <div className="text-[14px] mb-[6px]">{label}</div>
        <div className="text-[12px] text-white/60">Loading newsletters...</div>
      </div>);
    }
    return (<div>
      <div className="text-[14px] mb-[6px]">{label}</div>
      <select name={name} value={selectedValue} onChange={handleChange} className="w-full bg-[#1a1a2e] border border-white/20 rounded-[4px] px-[12px] py-[8px] text-white text-[14px]">
        <option value="">Default newsletter</option>
        {newsletters.map((nl) => (<option key={nl.value} value={nl.value}>
            {nl.label}
          </option>))}
      </select>
    </div>);
};
//# sourceMappingURL=ghost.newsletters.js.map