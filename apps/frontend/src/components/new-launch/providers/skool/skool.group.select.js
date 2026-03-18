'use client';
import { useEffect, useState } from 'react';
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
import { Select } from "../../../../../../../libraries/react-shared-libraries/src/form/select";
import { useSettings } from "../../../launches/helpers/use.values";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const SkoolGroupSelect = (props) => {
    const { onChange, name } = props;
    const t = useT();
    const customFunc = useCustomProviderFunction();
    const [groups, setGroups] = useState([]);
    const { getValues } = useSettings();
    const [currentGroup, setCurrentGroup] = useState();
    const onChangeInner = (event) => {
        setCurrentGroup(event.target.value);
        onChange(event);
    };
    useEffect(() => {
        customFunc.get('groups').then((data) => setGroups(data));
        const settings = getValues()[props.name];
        if (settings) {
            setCurrentGroup(settings);
        }
    }, []);
    if (!groups.length) {
        return null;
    }
    return (<Select name={name} label="Select Group" onChange={onChangeInner} value={currentGroup}>
      <option value="">{t('select_1', '--Select--')}</option>
      {groups.map((group) => (<option key={group.id} value={group.id}>
          {group.name}
        </option>))}
    </Select>);
};
//# sourceMappingURL=skool.group.select.js.map