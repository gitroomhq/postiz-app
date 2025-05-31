import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { FC } from 'react';
import { DiscordDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/discord.dto';
import { DiscordChannelSelect } from '@gitroom/frontend/components/launches/providers/discord/discord.channel.select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
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
