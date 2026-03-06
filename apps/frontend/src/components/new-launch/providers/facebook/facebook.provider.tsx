'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { FacebookDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/facebook.dto';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { FacebookPreview } from '@gitroom/frontend/components/new-launch/providers/facebook/facebook.preview';

const postTypes = [
  { value: 'post', label: 'Post / Reel / Video' },
  { value: 'story', label: 'Story' },
];

export const FacebookSettings = () => {
  const { register, watch } = useSettings();
  const postType = watch('post_type');

  return (
    <>
      <Select
        label="Post Type"
        {...register('post_type', { value: 'post' })}
      >
        {postTypes.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>

      {postType !== 'story' && (
        <Input
          label="Embedded URL (only for text Post)"
          {...register('url')}
        />
      )}
    </>
  );
};

export default withProvider<FacebookDto>({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: FacebookSettings,
  CustomPreviewComponent: FacebookPreview,
  dto: FacebookDto,
  checkValidity: async ([firstPost] = [], settings) => {
    if (settings?.post_type === 'story') {
      if (!firstPost?.length) {
        return 'Story requires at least one media item (image or video)';
      }
      if (firstPost.length > 1) {
        return 'Stories can only have one media item';
      }
      const checkVideosLength = await Promise.all(
        firstPost
          ?.filter((f) => (f?.path?.indexOf?.('mp4') ?? -1) > -1)
          ?.map((p) => p?.path)
          ?.map((p) => {
            return new Promise<number>((res) => {
              const video = document.createElement('video');
              video.preload = 'metadata';
              video.src = p;
              video.addEventListener('loadedmetadata', () => {
                res(video.duration);
              });
            });
          }) ?? []
      );
      for (const duration of checkVideosLength) {
        if (duration > 60) {
          return 'Facebook Stories videos must be 60 seconds or less';
        }
      }
    }
    return true;
  },
  maximumCharacters: 63206,
});
