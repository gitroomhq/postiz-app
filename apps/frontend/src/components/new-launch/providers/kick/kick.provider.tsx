'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { FC } from 'react';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { KickChannelSelect } from '@gitroom/frontend/components/new-launch/providers/kick/kick.channel.select';
import { KickDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/kick.dto';

const KickComponent: FC = () => {
  const form = useSettings();
  return (
    <div>
      <KickChannelSelect {...form.register('broadcasterUserId')} />
    </div>
  );
};

export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: KickComponent,
  CustomPreviewComponent: undefined,
  dto: KickDto,
  checkValidity: undefined,
  maximumCharacters: 500,
});

