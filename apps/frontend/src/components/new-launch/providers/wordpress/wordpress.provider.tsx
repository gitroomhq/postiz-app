'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { Input } from '@gitroom/react/form/input';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { WordpressPostType } from '@gitroom/frontend/components/new-launch/providers/wordpress/wordpress.post.type';
import { WordpressAuthor } from '@gitroom/frontend/components/new-launch/providers/wordpress/wordpress.author';
import { WordpressStatus } from '@gitroom/frontend/components/new-launch/providers/wordpress/wordpress.status';
import { WordpressCategories } from '@gitroom/frontend/components/new-launch/providers/wordpress/wordpress.categories';
import { WordpressTags } from '@gitroom/frontend/components/new-launch/providers/wordpress/wordpress.tags';
import { MediaComponent } from '@gitroom/frontend/components/media/media.component';
import { WordpressDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/wordpress.dto';

const WordpressSettings: FC = () => {
  const form = useSettings();
  return (
    <>
      <Input label="Title" {...form.register('title')} />
      <WordpressPostType {...form.register('type')} />
      <WordpressAuthor {...form.register('author')} />
      <WordpressStatus {...form.register('status')} />
      <Input label="Slug" {...form.register('slug')} />
      <Input label="Excerpt" {...form.register('excerpt')} />
      <MediaComponent
        label="Cover picture"
        description="Add a cover picture"
        {...form.register('main_image')}
      />
      <div className="mt-[20px]">
        <WordpressCategories
          label="Categories"
          {...form.register('categories', { value: [] })}
        />
      </div>
      <div>
        <WordpressTags
          label="Tags"
          {...form.register('tags', { value: [] })}
        />
      </div>
    </>
  );
};
export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: WordpressSettings,
  CustomPreviewComponent: undefined, // WordpressPreview,
  dto: WordpressDto,
  checkValidity: undefined,
  maximumCharacters: 100000,
});
