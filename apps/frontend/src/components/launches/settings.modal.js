import { __awaiter } from "tslib";
import React, { useCallback, useState } from 'react';
import { useModals } from "../layout/new-modal";
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { Slider } from "../../../../../libraries/react-shared-libraries/src/form/slider";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const Element = (props) => {
    const { setting, onChange } = props;
    const [value, setValue] = useState(setting.value);
    return (<div className="flex flex-col gap-[10px]">
      <div>{setting.title}</div>
      <div className="text-[14px]">{setting.description}</div>
      <Slider value={value === true ? 'on' : 'off'} onChange={() => {
            setValue(!value);
            onChange(!value);
        }} fill={true}/>
    </div>);
};
export const SettingsModal = (props) => {
    const fetch = useFetch();
    const t = useT();
    const { onClose, integration } = props;
    const modal = useModals();
    const [values, setValues] = useState(JSON.parse((integration === null || integration === void 0 ? void 0 : integration.additionalSettings) || '[]'));
    const changeValue = useCallback((index) => (value) => {
        const newValues = [...values];
        newValues[index].value = value;
        setValues(newValues);
    }, [values]);
    const save = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        yield fetch(`/integrations/${integration.id}/settings`, {
            method: 'POST',
            body: JSON.stringify({
                additionalSettings: JSON.stringify(values),
            }),
        });
        modal.closeAll();
        onClose();
    }), [values, integration]);
    return (<div>
      <div className="mt-[16px]">
        {values.map((setting, index) => (<Element key={setting.title} setting={setting} onChange={changeValue(index)}/>))}
      </div>

      <div className="my-[16px] flex gap-[10px]">
        <Button onClick={save}>{t('save', 'Save')}</Button>
      </div>
    </div>);
};
//# sourceMappingURL=settings.modal.js.map