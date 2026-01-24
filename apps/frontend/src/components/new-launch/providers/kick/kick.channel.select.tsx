'use client';

import { FC, useEffect, useState } from 'react';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { Select } from '@gitroom/react/form/select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const KickChannelSelect: FC<{
  name: string;
  onChange: (event: {
    target: {
      value: string;
      name: string;
    };
  }) => void;
}> = (props) => {
  const { onChange, name } = props;
  const t = useT();
  const customFunc = useCustomProviderFunction();
  const [channels, setChannels] = useState([]);
  const { getValues } = useSettings();
  const [currentChannel, setCurrentChannel] = useState<string | undefined>();

  const onChangeInner = (event: {
    target: {
      value: string;
      name: string;
    };
  }) => {
    setCurrentChannel(event.target.value);
    onChange(event);
  };

  useEffect(() => {
    customFunc.get('channels').then((data) => setChannels(data));
    const settings = getValues()[props.name];
    if (settings) {
      setCurrentChannel(settings);
    }
  }, []);

  if (!channels.length) {
    return null;
  }

  return (
    <Select
      name={name}
      label={t('kick_select_channel', 'Select Channel')}
      onChange={onChangeInner}
      value={currentChannel}
    >
      <option value="">{t('select_1', '--Select--')}</option>
      {channels.map((channel: any) => (
        <option key={channel.id} value={channel.id}>
          {channel.name}
        </option>
      ))}
    </Select>
  );
};

