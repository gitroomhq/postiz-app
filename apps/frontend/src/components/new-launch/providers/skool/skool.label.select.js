'use client';
import { useEffect, useState } from 'react';
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
import { Select } from "../../../../../../../libraries/react-shared-libraries/src/form/select";
import { useSettings } from "../../../launches/helpers/use.values";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const SkoolLabelSelect = (props) => {
    const { onChange, name, groupId } = props;
    const t = useT();
    const customFunc = useCustomProviderFunction();
    const [labels, setLabels] = useState([]);
    const { getValues } = useSettings();
    const [currentLabel, setCurrentLabel] = useState();
    const onChangeInner = (event) => {
        setCurrentLabel(event.target.value);
        onChange(event);
    };
    useEffect(() => {
        if (!groupId) {
            setLabels([]);
            setCurrentLabel(undefined);
            return;
        }
        customFunc.get('label', { id: groupId }).then((data) => setLabels(data));
    }, [groupId]);
    useEffect(() => {
        const settings = getValues()[name];
        if (settings) {
            setCurrentLabel(settings);
        }
    }, []);
    if (!groupId || !labels.length) {
        return null;
    }
    return (<Select name={name} label="Select Label" onChange={onChangeInner} value={currentLabel}>
      <option value="">{t('select_1', '--Select--')}</option>
      {labels.map((label) => (<option key={label.id} value={label.id}>
          {label.name}
        </option>))}
    </Select>);
};
//# sourceMappingURL=skool.label.select.js.map