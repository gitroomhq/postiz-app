import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import React, { FC, useCallback, useState } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Integration } from '@prisma/client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Slider } from '@gitroom/react/form/slider';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const Element: FC<{
  setting: any;
  onChange: (value: any) => void;
}> = (props) => {
  const { setting, onChange } = props;
  const [value, setValue] = useState(setting.value);
  return (
    <div className="flex flex-col gap-[10px] rounded-[16px] border border-white/8 bg-[linear-gradient(180deg,rgba(30,41,59,0.56),rgba(15,23,42,0.84))] p-[16px] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="text-[15px] font-[600] text-textColor">{setting.title}</div>
      <div className="text-[14px] text-textColor/62">{setting.description}</div>
      <Slider
        value={value === true ? 'on' : 'off'}
        onChange={() => {
          setValue(!value);
          onChange(!value);
        }}
        fill={true}
      />
    </div>
  );
};
export const SettingsModal: FC<{
  integration: Integration & {
    customer?: {
      id: string;
      name: string;
    };
  };
  onClose: () => void;
}> = (props) => {
  const fetch = useFetch();
  const t = useT();
  const { onClose, integration } = props;
  const modal = useModals();
  const [values, setValues] = useState(
    JSON.parse(integration?.additionalSettings || '[]')
  );
  const changeValue = useCallback(
    (index: number) => (value: any) => {
      const newValues = [...values];
      newValues[index].value = value;
      setValues(newValues);
    },
    [values]
  );
  const save = useCallback(async () => {
    await fetch(`/integrations/${integration.id}/settings`, {
      method: 'POST',
      body: JSON.stringify({
        additionalSettings: JSON.stringify(values),
      }),
    });
    modal.closeAll();
    onClose();
  }, [values, integration]);
  return (
    <div className="rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(10,14,26,0.9))] p-[18px] shadow-[0_24px_60px_rgba(2,6,23,0.22)] backdrop-blur-xl">
      <div className="mt-[4px] flex flex-col gap-[12px]">
        {values.map((setting: any, index: number) => (
          <Element
            key={setting.title}
            setting={setting}
            onChange={changeValue(index)}
          />
        ))}
      </div>

      <div className="mb-[4px] mt-[18px] flex gap-[10px]">
        <Button className="rounded-[12px]" onClick={save}>
          {t('save', 'Save')}
        </Button>
      </div>
    </div>
  );
};
