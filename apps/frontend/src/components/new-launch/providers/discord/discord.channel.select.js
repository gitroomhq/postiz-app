'use client';
import { useEffect, useState } from 'react';
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
import { Select } from "../../../../../../../libraries/react-shared-libraries/src/form/select";
import { useSettings } from "../../../launches/helpers/use.values";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const DiscordChannelSelect = (props) => {
    const { onChange, name } = props;
    const t = useT();
    const customFunc = useCustomProviderFunction();
    const [publications, setOrgs] = useState([]);
    const { getValues } = useSettings();
    const [currentMedia, setCurrentMedia] = useState();
    const onChangeInner = (event) => {
        setCurrentMedia(event.target.value);
        onChange(event);
    };
    useEffect(() => {
        customFunc.get('channels').then((data) => setOrgs(data));
        const settings = getValues()[props.name];
        if (settings) {
            setCurrentMedia(settings);
        }
    }, []);
    if (!publications.length) {
        return null;
    }
    return (<Select name={name} label="Select Channel" onChange={onChangeInner} value={currentMedia}>
      <option value="">{t('select_1', '--Select--')}</option>
      {publications.map((publication) => (<option key={publication.id} value={publication.id}>
          {publication.name}
        </option>))}
    </Select>);
};
//# sourceMappingURL=discord.channel.select.js.map