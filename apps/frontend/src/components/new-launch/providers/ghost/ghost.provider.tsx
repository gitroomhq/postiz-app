'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { MediaComponent } from '@gitroom/frontend/components/media/media.component';
import { GhostTags } from '@gitroom/frontend/components/new-launch/providers/ghost/ghost.tags';
import { GhostDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/ghost.dto';

const GhostSettings: FC = () => {
  const form = useSettings();
  return (
    <>
      <Input label="Title" {...form.register('title')} />
      <Input
        label="Slug (optional)"
        {...form.register('slug')}
      />
      <Select label="Status" name="status" defaultValue="published">
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </Select>
      <MediaComponent
        label="Feature Image"
        description="Add a feature image for your post"
        {...form.register('feature_image')}
      />
      <GhostTags label="Tags" {...form.register('tags', { value: [] })} />
    </>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: GhostSettings,
  CustomPreviewComponent: undefined,
  dto: GhostDto,
  checkValidity: undefined,
  maximumCharacters: 100000,
});
