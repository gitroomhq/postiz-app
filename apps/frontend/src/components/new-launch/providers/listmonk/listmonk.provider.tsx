'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { ListmonkDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/listmonk.dto';
import { Input } from '@gitroom/react/form/input';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { SelectList } from '@gitroom/frontend/components/new-launch/providers/listmonk/select.list';
import { SelectTemplates } from '@gitroom/frontend/components/new-launch/providers/listmonk/select.templates';

const SettingsComponent = () => {
  const form = useSettings();

  return (
    <>
      <Input label="Subject" {...form.register('subject')} />
      <Input label="Preview" {...form.register('preview')} />
      <SelectList {...form.register('list')} />
      <SelectTemplates {...form.register('templates')} />
    </>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: SettingsComponent,
  CustomPreviewComponent: undefined,
  dto: ListmonkDto,
  checkValidity: async (posts) => {
    if (
      posts.some(
        (p) => p.some((a) => a.path.indexOf('mp4') > -1) && p.length > 1
      )
    ) {
      return 'You can only upload one video per post.';
    }

    if (posts.some((p) => p.length > 4)) {
      return 'There can be maximum 4 pictures in a post.';
    }
    return true;
  },
  maximumCharacters: 300000,
});
