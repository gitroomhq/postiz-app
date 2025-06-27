'use client';

import { withProvider } from '@chaolaolo/frontend/components/new-launch/providers/high.order.provider';
import { FC } from 'react';
import { DiscordDto } from '@chaolaolo/nestjs-libraries/dtos/posts/providers-settings/discord.dto';
import { DiscordChannelSelect } from '@chaolaolo/frontend/components/new-launch/providers/discord/discord.channel.select';
import { useSettings } from '@chaolaolo/frontend/components/launches/helpers/use.values';
const DiscordComponent: FC = () => {
  const form = useSettings();
  return (
    <div>
      <DiscordChannelSelect {...form.register('channel')} />
    </div>
  );
};
export default withProvider(
  DiscordComponent,
  undefined,
  DiscordDto,
  undefined,
  1980
);
