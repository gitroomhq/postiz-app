import React, { FC, useCallback, useState } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import type { Integration } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Slider } from '@gitroom/react/form/slider';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

type Translate = (key: string, fallback: string) => string;

/**
 * Stored `title` is the provider key (X `maxLength` looks up `"Verified"`).
 * Visible copy is mapped here so the channel row and Edit modal stay in sync.
 */
export function publishingOptionCopy(
  option: {
    title?: string;
    description?: string;
    type?: string;
    value?: unknown;
  },
  t: Translate
) {
  if (option.title === 'Verified') {
    const on = option.value === true;
    return {
      title: t('x_long_posts', 'Long posts'),
      hint: t(
        'x_long_posts_hint',
        'X Premium character limit: 4000 instead of 280.'
      ),
      description: t(
        'x_long_posts_description',
        'Turn on if this account has X Premium so the composer allows 4000 characters. Off keeps the classic 280-character limit. This is not the blue check.'
      ),
      status: on
        ? t('x_long_posts_enabled', '4000')
        : t('x_long_posts_disabled', '280'),
    };
  }

  const isBool = option.type === 'boolean' || option.type === 'checkbox';
  return {
    title: option.title || '',
    hint: isBool
      ? t(
          'applies_to_every_post_on_this_channel',
          'Applies to every post on this channel.'
        )
      : t(
          'default_value_used_when_publishing_here',
          'Default value used when publishing here'
        ),
    description: option.description || '',
    status:
      typeof option.value === 'boolean'
        ? option.value
          ? t('active', 'Active')
          : t('off', 'Off')
        : undefined,
  };
}

export const Element: FC<{
  setting: any;
  onChange: (value: any) => void;
}> = (props) => {
  const { setting, onChange } = props;
  const t = useT();
  const copy = publishingOptionCopy(setting, (key, fallback) =>
    t(key, fallback)
  );
  const [value, setValue] = useState(setting.value);
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="text-pqText">{copy.title}</div>
      <div className="text-[14px] text-pqMuted">{copy.description}</div>
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
    <div>
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
