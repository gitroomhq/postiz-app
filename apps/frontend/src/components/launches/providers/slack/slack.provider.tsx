import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { FC } from 'react';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { SlackChannelSelect } from '@gitroom/frontend/components/launches/providers/slack/slack.channel.select';
import { SlackDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/slack.dto';

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
