'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { SkoolSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/skool.settings.dto';
import { Input } from '@gitroom/react/form/input';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';

const SkoolSettings: FC = () => {
  const form = useSettings();
  return (
    <>
      <Input label="Title" {...form.register('title')} />
      <Input label="Label ID (Optional, overrides default)" {...form.register('labelId')} />
    </>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: SkoolSettings,
  CustomPreviewComponent: undefined,
  dto: SkoolSettingsDto,
  checkValidity: undefined,
  maximumCharacters: 100000,
});

