'use client';

import { withProvider } from '@chaolaolo/frontend/components/new-launch/providers/high.order.provider';
import { FC } from 'react';
import { useSettings } from '@chaolaolo/frontend/components/launches/helpers/use.values';
import { SlackChannelSelect } from '@chaolaolo/frontend/components/new-launch/providers/slack/slack.channel.select';
import { SlackDto } from '@chaolaolo/nestjs-libraries/dtos/posts/providers-settings/slack.dto';
const SlackComponent: FC = () => {
  const form = useSettings();
  return (
    <div>
      <SlackChannelSelect {...form.register('channel')} />
    </div>
  );
};
export default withProvider(
  SlackComponent,
  undefined,
  SlackDto,
  undefined,
  280
);
