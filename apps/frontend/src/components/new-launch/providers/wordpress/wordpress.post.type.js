'use client';
import { useEffect, useState } from 'react';
import { Select } from "../../../../../../../libraries/react-shared-libraries/src/form/select";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
import { useSettings } from "../../../launches/helpers/use.values";
export const WordpressPostType = (props) => {
    const { onChange, name } = props;
    const t = useT();
    const customFunc = useCustomProviderFunction();
    const [orgs, setOrgs] = useState([]);
    const { getValues } = useSettings();
    const [currentMedia, setCurrentMedia] = useState();
    const onChangeInner = (event) => {
        setCurrentMedia(event.target.value);
        onChange(event);
    };
    useEffect(() => {
        customFunc.get('postTypes').then((data) => setOrgs(data));
        const settings = getValues()[props.name];
        if (settings) {
            setCurrentMedia(settings);
        }
    }, []);
    if (!orgs.length) {
        return null;
    }
    return (<Select name={name} label="Select type" onChange={onChangeInner} value={currentMedia}>
      <option value="">{t('select_1', '--Select--')}</option>
      {orgs.map((org) => (<option key={org.id} value={org.id}>
          {org.name}
        </option>))}
    </Select>);
};
//# sourceMappingURL=wordpress.post.type.js.map