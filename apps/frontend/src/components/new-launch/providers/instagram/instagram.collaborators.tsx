'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { FC, useEffect } from 'react';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { Select } from '@gitroom/react/form/select';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { InstagramDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/instagram.dto';
import { InstagramCollaboratorsTags } from '@gitroom/frontend/components/new-launch/providers/instagram/instagram.tags';
import { InstagramAudioSelector } from '@gitroom/frontend/components/new-launch/providers/instagram/instagram.audio';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
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
  const { watch, register, formState, control, setValue } = useSettings();
  const { integration } = useIntegration();
  const postCurrentType = watch('post_type');
  const isTrialReel = watch('is_trial_reel');
  // The Audio API is only available with Facebook Login, not Instagram Login
  const supportsAudio = integration?.identifier === 'instagram';
  // DBU-managed content picks its type ONCE in the composer's "Content Type"
  // selector. Here we mirror it onto Instagram's native post_type (Story -> story;
  // everything else -> post) and hide this duplicate selector.
  const { dbuContentType } = useLaunchStore(
    useShallow((s) => ({ dbuContentType: s.contentType }))
  );
  const dbuManaged = !!dbuContentType;
  const igPostType = dbuContentType === 'story' ? 'story' : 'post';
  useEffect(() => {
    if (dbuManaged) {
      setValue('post_type', igPostType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbuManaged, igPostType]);
  return (
    <>
      {dbuManaged ? (
        <>
          <input type="hidden" {...register('post_type')} />
          <div className="text-[13px] text-textColor opacity-70">
            {t('content_type_set_above', 'Content type is set above')} (
            {t(`content_type_${igPostType}`, igPostType === 'story' ? 'Story' : 'Post / Reel')}
            ).
          </div>
        </>
      ) : (
        <Select
          label="Post Type"
          {...register('post_type', {
            value: 'post',
          })}
        >
          <option value="">
            {t('select_post_type', 'Select Post Type...')}
          </option>
          {postType.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      )}

      {postCurrentType !== 'story' && (
        <InstagramCollaboratorsTags
          label="Collaborators (max 3) - accounts can't be private"
          {...register('collaborators', {
            value: [],
          })}
        />
      )}

      {postCurrentType === 'post' && (
        <div className="mt-[18px]">
          <InstagramAudioSelector
            label={t(
              'instagram_audio_label',
              'Audio (Reels only - single video)'
            )}
            disabled={!supportsAudio}
            {...register('audio')}
          />
        </div>
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
  maximumCharacters: 2200,
  comments: 'no-media'
});
