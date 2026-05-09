'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { Input } from '@gitroom/react/form/input';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { MediaComponent } from '@gitroom/frontend/components/media/media.component';
import { BlogCreaStackDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/blog-crea-stack.dto';

const BlogCreaStackSettings: FC = () => {
  const form = useSettings();
  return (
    <>
      <Input label="Title" {...form.register('title')} />
      <Input
        label="Slug"
        placeholder="auto-generated from title if empty"
        {...form.register('slug')}
      />
      <Input label="Excerpt" {...form.register('excerpt')} />
      <Input
        label="Locale"
        placeholder="es"
        {...form.register('locale')}
      />
      <Input
        label="Category slug"
        placeholder="optional — must exist in blog DB"
        {...form.register('categorySlug')}
      />
      <Input
        label="Tags (comma-separated)"
        placeholder="optional — auto-created if missing"
        {...form.register('tags')}
      />
      <Input
        label="Translation group ID"
        placeholder="optional — share between es/en versions"
        {...form.register('translationGroupId')}
      />
      <MediaComponent
        label="Featured image"
        description="Cover image for the post"
        {...form.register('featuredImage')}
      />
    </>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: BlogCreaStackSettings,
  CustomPreviewComponent: undefined,
  dto: BlogCreaStackDto,
  checkValidity: undefined,
  maximumCharacters: 100000,
});
