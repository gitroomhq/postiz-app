'use client';
import { useEffect, useState } from 'react';
import { useCustomProviderFunction } from "../../../launches/helpers/use.custom.provider.function";
import { Select } from "../../../../../../../libraries/react-shared-libraries/src/form/select";
import { useSettings } from "../../../launches/helpers/use.values";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const WhopCompanySelect = (props) => {
    const { onChange, name } = props;
    const t = useT();
    const customFunc = useCustomProviderFunction();
    const [companies, setCompanies] = useState([]);
    const { getValues } = useSettings();
    const [currentCompany, setCurrentCompany] = useState();
    const onChangeInner = (event) => {
        setCurrentCompany(event.target.value);
        onChange(event);
    };
    useEffect(() => {
        customFunc.get('companies').then((data) => setCompanies(data));
        const settings = getValues()[props.name];
        if (settings) {
            setCurrentCompany(settings);
        }
    }, []);
    if (!companies.length) {
        return null;
    }
    return (<Select name={name} label="Select Company" onChange={onChangeInner} value={currentCompany}>
      <option value="">{t('select_1', '--Select--')}</option>
      {companies.map((company) => (<option key={company.id} value={company.id}>
          {company.name}
        </option>))}
    </Select>);
};
//# sourceMappingURL=whop.company.select.js.map