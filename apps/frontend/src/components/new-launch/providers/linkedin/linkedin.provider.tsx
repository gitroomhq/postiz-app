'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { LinkedinDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/linkedin.dto';

const LinkedInSettings = () => {
  const t = useT();
  const { watch, register, formState, control } = useSettings();

  return (
    <div className="mb-[20px]">
      <Checkbox
        variant="hollow"
        label={t('post_as_images_carousel', 'Post as images carousel')}
        {...register('post_as_images_carousel', {
          value: false,
        })}
      />
    </div>
  );
};
export default withProvider<LinkedinDto>({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: LinkedInSettings,
  CustomPreviewComponent: undefined,
  dto: LinkedinDto,
  checkValidity: async (posts, vals) => {
    const [firstPost, ...restPosts] = posts;

    if (
      vals.post_as_images_carousel &&
      (firstPost.length < 2 ||
        firstPost.some((p) => p.path.indexOf('mp4') > -1))
    ) {
      return 'Carousel can only be created with 2 or more images and no videos.';
    }

    if (
      firstPost.length > 1 &&
      firstPost.some((p) => p.path.indexOf('mp4') > -1)
    ) {
      return 'Can have maximum 1 media when selecting a video.';
    }
    if (restPosts.some((p) => p.length > 0)) {
      return 'Comments can only contain text.';
    }
    return true;
  },
  maximumCharacters: 3000,
});
