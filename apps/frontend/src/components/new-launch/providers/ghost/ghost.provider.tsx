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
import { GhostAuthors } from '@gitroom/frontend/components/new-launch/providers/ghost/ghost.authors';
import { GhostDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/ghost.dto';

const GhostSettings: FC = () => {
  const form = useSettings();
  return (
    <>
      {/* Basic Settings */}
      <div className="flex flex-col gap-[12px]">
        <Input label="Title" {...form.register('title')} placeholder="Post title" />
        <Input
          label="Slug (optional)"
          {...form.register('slug')}
          placeholder="custom-url-slug"
        />
        <Input
          label="Custom Excerpt (optional)"
          {...form.register('custom_excerpt')}
          placeholder="Brief summary for SEO and previews"
        />
        <Select label="Status" name="status" defaultValue="published">
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
        </Select>
        <Select label="Visibility" name="visibility" defaultValue="public">
          <option value="public">Public</option>
          <option value="members">Members Only</option>
          <option value="paid">Paid Members Only</option>
        </Select>
      </div>

      {/* Feature Image */}
      <div className="flex flex-col gap-[12px] mt-[16px]">
        <div className="text-[14px] font-semibold text-white">Feature Image</div>
        <MediaComponent
          label="Image"
          description="Add a feature image for your post"
          {...form.register('feature_image')}
        />
        <Input
          label="Alt Text"
          {...form.register('feature_image_alt')}
          placeholder="Describe the image for accessibility"
        />
        <Input
          label="Caption"
          {...form.register('feature_image_caption')}
          placeholder="Image caption displayed below"
        />
      </div>

      {/* Tags & Authors */}
      <div className="flex flex-col gap-[12px] mt-[16px]">
        <div className="text-[14px] font-semibold text-white">Organization</div>
        <GhostTags label="Tags" {...form.register('tags', { value: [] })} />
        <GhostAuthors label="Authors" {...form.register('authors', { value: [] })} />
      </div>

      {/* SEO Settings */}
      <div className="flex flex-col gap-[12px] mt-[16px]">
        <div className="text-[14px] font-semibold text-white">SEO Settings</div>
        <Input
          label="Meta Title (optional)"
          {...form.register('meta_title')}
          placeholder="Override title for search engines"
        />
        <Input
          label="Meta Description (optional)"
          {...form.register('meta_description')}
          placeholder="Override description for search engines"
        />
        <Input
          label="Canonical URL (optional)"
          {...form.register('canonical_url')}
          placeholder="https://example.com/original-post"
        />
      </div>

      {/* Open Graph */}
      <div className="flex flex-col gap-[12px] mt-[16px]">
        <div className="text-[14px] font-semibold text-white">Social Preview (Open Graph)</div>
        <Input
          label="OG Title"
          {...form.register('og_title')}
          placeholder="Title for social sharing"
        />
        <Input
          label="OG Description"
          {...form.register('og_description')}
          placeholder="Description for social sharing"
        />
        <Input
          label="OG Image URL"
          {...form.register('og_image')}
          placeholder="https://example.com/social-image.jpg"
        />
      </div>

      {/* Twitter Card */}
      <div className="flex flex-col gap-[12px] mt-[16px]">
        <div className="text-[14px] font-semibold text-white">Twitter Card</div>
        <Input
          label="Twitter Title"
          {...form.register('twitter_title')}
          placeholder="Title for Twitter sharing"
        />
        <Input
          label="Twitter Description"
          {...form.register('twitter_description')}
          placeholder="Description for Twitter sharing"
        />
        <Input
          label="Twitter Image URL"
          {...form.register('twitter_image')}
          placeholder="https://example.com/twitter-image.jpg"
        />
      </div>

      {/* Email Settings */}
      <div className="flex flex-col gap-[12px] mt-[16px]">
        <div className="text-[14px] font-semibold text-white">Email Newsletter</div>
        <Input
          label="Email Subject (optional)"
          {...form.register('email_subject')}
          placeholder="Custom subject line for email newsletter"
        />
      </div>
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