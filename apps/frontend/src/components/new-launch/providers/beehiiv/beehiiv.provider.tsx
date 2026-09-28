'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { BeehiivDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/beehiiv.dto';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { MediaComponent } from '@gitroom/frontend/components/media/media.component';

const status = [
  {
    label: 'Draft',
    value: 'draft',
  },
  {
    label: 'Publish (Max / Enterprise plans only)',
    value: 'confirmed',
  },
];

const BeehiivSettings: FC = () => {
  const { register } = useSettings();

  return (
    <>
      <Input label="Title" {...register('title')} />
      <Input label="Subtitle" {...register('subtitle')} />
      <Select
        label="Status"
        {...register('status', {
          value: 'draft',
        })}
      >
        {status.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>
      <MediaComponent
        type="image"
        label="Thumbnail"
        description="Thumbnail picture (optional)"
        {...register('thumbnail')}
      />
    </>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: BeehiivSettings,
  CustomPreviewComponent: undefined,
  dto: BeehiivDto,
  maximumCharacters: 300000,
});
