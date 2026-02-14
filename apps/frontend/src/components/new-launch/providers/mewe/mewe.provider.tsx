'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { FC } from 'react';
import { MeweDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/mewe.dto';
import { MeweGroupSelect } from '@gitroom/frontend/components/new-launch/providers/mewe/mewe.group.select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';

const MeweComponent: FC = () => {
  const form = useSettings();
  return (
    <div>
      <MeweGroupSelect {...form.register('group')} />
    </div>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  comments: false,
  minimumCharacters: [],
  SettingsComponent: MeweComponent,
  CustomPreviewComponent: undefined,
  dto: MeweDto,
  checkValidity: undefined,
  maximumCharacters: 63206,
});
