'use client';
import { useEffect, useState } from 'react';
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
import { Select } from "../../../../../../../libraries/react-shared-libraries/src/form/select";
import { useSettings } from "../../../launches/helpers/use.values";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const WhopExperienceSelect = (props) => {
    const { onChange, name, companyId } = props;
    const t = useT();
    const customFunc = useCustomProviderFunction();
    const [experiences, setExperiences] = useState([]);
    const { getValues } = useSettings();
    const [currentExperience, setCurrentExperience] = useState();
    const onChangeInner = (event) => {
        setCurrentExperience(event.target.value);
        onChange(event);
    };
    useEffect(() => {
        if (!companyId) {
            setExperiences([]);
            setCurrentExperience(undefined);
            return;
        }
        customFunc
            .get('experiences', { id: companyId })
            .then((data) => setExperiences(data));
    }, [companyId]);
    useEffect(() => {
        const settings = getValues()[name];
        if (settings) {
            setCurrentExperience(settings);
        }
    }, []);
    if (!companyId || !experiences.length) {
        return null;
    }
    return (<Select name={name} label="Select Forum" onChange={onChangeInner} value={currentExperience}>
      <option value="">{t('select_1', '--Select--')}</option>
      {experiences.map((experience) => (<option key={experience.id} value={experience.id}>
          {experience.name}
        </option>))}
    </Select>);
};
//# sourceMappingURL=whop.experience.select.js.map