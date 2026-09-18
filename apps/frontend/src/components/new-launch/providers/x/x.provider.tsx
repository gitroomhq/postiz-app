'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { ThreadFinisher } from '@gitroom/frontend/components/new-launch/finisher/thread.finisher';
import { Select } from '@gitroom/react/form/select';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { XDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/x.dto';
import { Input } from '@gitroom/react/form/input';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { MediaComponent } from '@gitroom/frontend/components/media/media.component';

const whoCanReply = [
  {
    label: 'Everyone',
    value: 'everyone',
  },
  {
    label: 'Accounts you follow',
    value: 'following',
  },
  {
    label: 'Mentioned accounts',
    value: 'mentionedUsers',
  },
  {
    label: 'Subscribers',
    value: 'subscribers',
  },
  {
    label: 'Verified accounts',
    value: 'verified',
  },
];

const SettingsComponent = () => {
  const t = useT();
  const { register, watch, setValue } = useSettings();
  const postType = watch('post_type') || 'post';

  return (
    <>
      <Select
        label={t('label_post_type', 'Post type')}
        className="mb-5"
        hideErrors={true}
        {...register('post_type', {
          value: 'post',
        })}
      >
        <option value="post">{t('label_post_type_post', 'Post')}</option>
        <option value="article">
          {t('label_post_type_article', 'Article (long-form)')}
        </option>
      </Select>

      {postType === 'article' ? (
        <>
          <Input
            label={t('label_article_title', 'Article title')}
            {...register('article_title')}
          />
          <Select
            label={t('label_article_status', 'Article status')}
            className="mb-5"
            hideErrors={true}
            {...register('article_status', {
              value: 'draft',
            })}
          >
            <option value="draft">
              {t('label_article_status_draft', 'Save as draft')}
            </option>
            <option value="published">
              {t('label_article_status_published', 'Publish')}
            </option>
          </Select>
          <MediaComponent
            type="image"
            label={t('label_article_cover', 'Cover image')}
            description={t(
              'description_article_cover',
              'Cover picture for the article (optional)'
            )}
            {...register('article_cover')}
          />
        </>
      ) : (
        <>
          <Select
            label={t(
              'label_who_can_reply_to_this_post',
              'Who can reply to this post?'
            )}
            className="mb-5"
            hideErrors={true}
            {...register('who_can_reply_post', {
              value: 'everyone',
            })}
          >
            {whoCanReply.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>

          <Input
            label={
              'Post to a community, URL (Ex: https://x.com/i/communities/1493446837214187523)'
            }
            {...register('community')}
          />

          <div className="mt-5 flex flex-col gap-[10px]">
            <Checkbox
              label={t('label_made_with_ai', 'Made with AI')}
              {...register('made_with_ai')}
            />
            <Checkbox
              label={t('label_paid_partnership', 'Paid partnership')}
              {...register('paid_partnership')}
            />
          </div>

          <ThreadFinisher />
        </>
      )}
    </>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: SettingsComponent,
  CustomPreviewComponent: undefined,
  dto: XDto,
  maximumCharacters: (settings) => {
    if (settings?.[0]?.value) {
      return 4000;
    }
    return 280;
  },
});
