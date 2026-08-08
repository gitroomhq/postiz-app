'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { GhostSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/ghost.settings.dto';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { Canonical } from '@gitroom/react/form/canonical';
import { MediaComponent } from '@gitroom/frontend/components/media/media.component';
import { Checkbox } from '@gitroom/react/form/checkbox';

const GhostSettings: FC = () => {
  const form = useSettings();
  const { date } = useIntegration();
  const status = form.watch('status') || 'published';
  const newsletter = form.watch('newsletter');

  return (
    <>
      <Input label="Title" {...form.register('title')} />
      <Select
        label="Status"
        {...form.register('status', { value: 'published' })}
      >
        <option value="published">Publish</option>
        <option value="draft">Draft</option>
      </Select>
      <Canonical
        date={date}
        label="Canonical Link"
        {...form.register('canonical')}
      />
      <MediaComponent
        label="Cover picture"
        description="Add a cover picture"
        {...form.register('main_image')}
      />
      <Input
        label="Tags"
        placeholder="News, Updates"
        {...form.register('tags')}
      />
      <Input
        label="Newsletter slug"
        placeholder="default-newsletter"
        {...form.register('newsletter')}
      />
      {status === 'published' && newsletter && (
        <>
          <Select
            label="Email segment"
            {...form.register('emailSegment', { value: 'all' })}
          >
            <option value="all">All subscribers</option>
            <option value="status:free">Free subscribers</option>
            <option value="status:-free">Paid subscribers</option>
          </Select>
          <div className="mt-[4px]">
            <Checkbox label="Email only" {...form.register('emailOnly')} />
          </div>
        </>
      )}
    </>
  );
};

export default withProvider<GhostSettingsDto>({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: GhostSettings,
  CustomPreviewComponent: undefined,
  dto: GhostSettingsDto,
  maximumCharacters: 100000,
});
