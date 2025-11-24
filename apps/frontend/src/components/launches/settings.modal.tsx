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
    <div className="flex flex-col gap-[10px]">
      <div>{setting.title}</div>
      <div className="text-[14px]">{setting.description}</div>
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
    <div className="rounded-[4px] border border-customColor6 bg-sixth px-[16px] pb-[16px] relative w-full">
      <TopTitle title={`Additional Settings`} />
      <button
        className="outline-none absolute end-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
        type="button"
        onClick={() => modal.closeAll()}
      >
        <svg
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
        >
          <path
            d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          ></path>
        </svg>
      </button>

      <div className="mt-[16px]">
        {values.map((setting: any, index: number) => (
          <Element
            key={setting.title}
            setting={setting}
            onChange={changeValue(index)}
          />
        ))}
      </div>

      <div className="my-[16px] flex gap-[10px]">
        <Button onClick={save}>{t('save', 'Save')}</Button>
      </div>
    </div>
  );
};
