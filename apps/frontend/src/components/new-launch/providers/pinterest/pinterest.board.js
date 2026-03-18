'use client';
import { useEffect, useState } from 'react';
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
import { Select } from "../../../../../../../libraries/react-shared-libraries/src/form/select";
import { useSettings } from "../../../launches/helpers/use.values";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const PinterestBoard = (props) => {
    const { onChange, name } = props;
    const t = useT();
    const customFunc = useCustomProviderFunction();
    const [orgs, setOrgs] = useState();
    const { getValues } = useSettings();
    const [currentMedia, setCurrentMedia] = useState();
    const onChangeInner = (event) => {
        setCurrentMedia(event.target.value);
        onChange(event);
    };
    useEffect(() => {
        customFunc.get('boards').then((data) => setOrgs(data));
        const settings = getValues()[props.name];
        if (settings) {
            setCurrentMedia(settings);
        }
    }, []);
    if (!orgs) {
        return null;
    }
    if (!orgs.length) {
        return 'No boards found, you have to create a board first';
    }
    return (<Select name={name} label="Select board" onChange={onChangeInner} value={currentMedia}>
      <option value="">{t('select_1', '--Select--')}</option>
      {orgs.map((org) => (<option key={org.id} value={org.id}>
          {org.name}
        </option>))}
    </Select>);
};
//# sourceMappingURL=pinterest.board.js.map