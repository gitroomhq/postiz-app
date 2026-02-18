'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { FC } from 'react';
import { Select } from '@gitroom/react/form/select';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { InstagramDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/instagram.dto';
import { InstagramCollaboratorsTags } from '@gitroom/frontend/components/new-launch/providers/instagram/instagram.tags';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { InstagramPreview } from '@gitroom/frontend/components/new-launch/providers/instagram/instagram.preview';
const postType = [
  {
    value: 'post',
    label: 'Post / Reel',
  },
  {
    value: 'story',
    label: 'Story',
  },
];

const graduationStrategies = [
  {
    value: 'MANUAL',
    label: 'Manual',
  },
  {
    value: 'SS_PERFORMANCE',
    label: 'Auto (based on performance)',
  },
];
const InstagramCollaborators: FC<{
  values?: any;
}> = (props) => {
  const t = useT();
  const { watch, register, formState, control } = useSettings();
  const postCurrentType = watch('post_type');
  const isTrialReel = watch('is_trial_reel');
  return (
    <>
      <Select
        label="Post Type"
        {...register('post_type', {
          value: 'post',
        })}
      >
        <option value="">{t('select_post_type', 'Select Post Type...')}</option>
        {postType.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>

      {postCurrentType !== 'story' && (
        <InstagramCollaboratorsTags
          label="Collaborators (max 3) - accounts can't be private"
          {...register('collaborators', {
            value: [],
          })}
        />
      )}

      {postCurrentType === 'post' && (
        <div className="mt-[18px] flex flex-col gap-[18px]">
          <Checkbox
            {...register('is_trial_reel', {
              value: false,
            })}
            label={t('trial_reel', 'Trial Reel (share only to non-followers first)')}
          />

          {isTrialReel && (
            <Select
              label="Graduation Strategy"
              {...register('graduation_strategy', {
                value: 'MANUAL',
              })}
            >
              {graduationStrategies.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          )}
        </div>
      )}
    </>
  );
};
export default withProvider<InstagramDto>({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: InstagramCollaborators,
  CustomPreviewComponent: InstagramPreview,
  dto: InstagramDto,
  checkValidity: async ([firstPost, ...otherPosts] = [], settings) => {
    if (!firstPost?.length) {
      return 'Should have at least one media';
    }
    if (settings?.is_trial_reel) {
      if ((firstPost?.length ?? 0) > 1) {
        return 'Trial Reels can only have one video';
      }
      const hasVideo = firstPost?.some(
        (f) => (f?.path?.indexOf?.('mp4') ?? -1) > -1
      );
      if (!hasVideo) {
        return 'Trial Reels must be a video';
      }
    }
    const checkVideosLength = await Promise.all(
      firstPost
        ?.filter((f) => (f?.path?.indexOf?.('mp4') ?? -1) > -1)
        ?.flatMap((p) => p?.path)
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
    for (const video of checkVideosLength) {
      if (video > 60 && settings?.post_type === 'story') {
        return 'Stories should be maximum 60 seconds';
      }
      if (video > 180 && settings?.post_type === 'post') {
        return 'Reel should be maximum 180 seconds';
      }
    }
    return true;
  },
  maximumCharacters: 2200,
  comments: 'no-media'
});
