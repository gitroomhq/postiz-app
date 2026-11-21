'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { Input } from '@gitroom/react/form/input';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { MediaComponent } from '@gitroom/frontend/components/media/media.component';
import { GitBlogCategories } from '@gitroom/frontend/components/new-launch/providers/git-blog/git.blog.categories';
import { GitBlogDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/git.blog.dto';

const GitBlogSettings: FC = () => {
  const form = useSettings();
  return (
    <>
      <Input label="Title" {...form.register('title')} />
      <Input label="Subtitle" {...form.register('subtitle')} />
      <Input
        label="Slug (leave empty to use the title)"
        {...form.register('slug')}
      />
      <GitBlogCategories label="Categories" {...form.register('categories')} />
      <MediaComponent
        label="Featured image"
        description="Add a featured image"
        {...form.register('main_image')}
      />
      <div className="mt-[20px]">
        <Checkbox label="Save as draft" {...form.register('draft')} />
      </div>
    </>
  );
};
export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: GitBlogSettings,
  CustomPreviewComponent: undefined,
  dto: GitBlogDto,
  maximumCharacters: 100000,
});
