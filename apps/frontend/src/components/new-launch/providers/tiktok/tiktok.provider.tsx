'use client';

import {
  FC,
  ReactEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { TikTokDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tiktok.dto';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Select } from '@gitroom/react/form/select';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { Checkbox } from '@gitroom/react/form/checkbox';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { Input } from '@gitroom/react/form/input';

const CheckTikTokValidity: FC<{
  picture: string;
}> = (props) => {
  const { register } = useSettings();
  const t = useT();

  const func = useCustomProviderFunction();
  const [maxVideoLength, setMaxVideoLength] = useState(0);
  const [isValidVideo, setIsValidVideo] = useState<undefined | boolean>(
    undefined
  );
  const registerVideo = register('isValidVideo');
  const video = useMemo(() => {
    return props.picture;
  }, [props.picture]);
  useEffect(() => {
    loadStats();
  }, []);
  const loadStats = useCallback(async () => {
    const { maxDurationSeconds } = await func.get('maxVideoLength');
    // setMaxVideoLength(5);
    setMaxVideoLength(maxDurationSeconds);
  }, []);
  const loadVideo: ReactEventHandler<HTMLVideoElement> = useCallback(
    (e) => {
      // @ts-ignore
      setIsValidVideo(e.target.duration <= maxVideoLength);
      registerVideo.onChange({
        target: {
          name: 'isValidVideo',
          // @ts-ignore
          value: String(e.target.duration <= maxVideoLength),
        },
      });
    },
    [maxVideoLength, registerVideo]
  );
  if (!maxVideoLength || !video || video.indexOf('mp4') === -1) {
    return null;
  }
  return (
    <>
      {isValidVideo === false && (
        <div className="text-red-600 my-[20px]">
          {t(
            'video_length_is_invalid_must_be_up_to',
            'Video length is invalid, must be up to'
          )}
          {maxVideoLength}
          {t('seconds', 'seconds')}
        </div>
      )}
      <video
        controls
        onLoadedMetadata={loadVideo}
        className="w-0 h-0 overflow-hidden pointer-events-none"
      >
        <source src={video} type="video/mp4" />
      </video>
    </>
  );
};
const TikTokSettings: FC<{
  values?: any;
}> = (props) => {
  const { watch, register } = useSettings();
  const { value } = useIntegration();
  const t = useT();

  const isTitle = useMemo(() => {
    return value?.[0].image.some((p) => p.path.indexOf('mp4') === -1);
  }, [value]);

  const disclose = watch('disclose');
  const brand_organic_toggle = watch('brand_organic_toggle');
  const brand_content_toggle = watch('brand_content_toggle');
  const content_posting_method = watch('content_posting_method');
  const isUploadMode = content_posting_method === 'UPLOAD';

  const privacyLevel = [
    {
      value: 'PUBLIC_TO_EVERYONE',
      label: t('public_to_everyone', 'Public to everyone'),
    },
    {
      value: 'MUTUAL_FOLLOW_FRIENDS',
      label: t('mutual_follow_friends', 'Mutual follow friends'),
    },
    {
      value: 'FOLLOWER_OF_CREATOR',
      label: t('follower_of_creator', 'Follower of creator'),
    },
    {
      value: 'SELF_ONLY',
      label: t('self_only', 'Self only'),
    },
  ];
  const contentPostingMethod = [
    {
      value: 'DIRECT_POST',
      label: t(
        'post_content_directly_to_tiktok',
        'Post content directly to TikTok'
      ),
    },
    {
      value: 'UPLOAD',
      label: t(
        'upload_content_to_tiktok_without_posting',
        'Upload content to TikTok without posting it'
      ),
    },
  ];
  const yesNo = [
    {
      value: 'yes',
      label: t('yes', 'Yes'),
    },
    {
      value: 'no',
      label: t('no', 'No'),
    },
  ];

  return (
    <div className="flex flex-col">
      {/*<CheckTikTokValidity picture={props?.values?.[0]?.image?.[0]?.path} />*/}
      {isTitle && (
        <Input label="Title" {...register('title')} maxLength={90} />
      )}
      <Select
        label={t('label_who_can_see_this_video', 'Who can see this video?')}
        hideErrors={true}
        disabled={isUploadMode}
        {...register('privacy_level', {
          value: 'PUBLIC_TO_EVERYONE',
        })}
      >
        <option value="">{t('select', 'Select')}</option>
        {privacyLevel.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
      <div className="text-[14px] mt-[10px] mb-[18px] text-balance">
        {t(
          'choose_upload_without_posting_description',
          `Choose upload without posting if you want to review and edit your content within TikTok's app before publishing.
        This gives you access to TikTok's built-in editing tools and lets you make final adjustments before posting.`
        )}
      </div>
      <Select
        label={t('label_content_posting_method', 'Content posting method')}
        {...register('content_posting_method', {
          value: 'DIRECT_POST',
        })}
      >
        <option value="">{t('select', 'Select')}</option>
        {contentPostingMethod.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
      <Select
        hideErrors={true}
        label={t('label_auto_add_music', 'Auto add music')}
        {...register('autoAddMusic', {
          value: 'no',
        })}
      >
        <option value="">{t('select', 'Select')}</option>
        {yesNo.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
      <div className="text-[14px] mt-[10px] mb-[24px] text-balance">
        {t(
          'this_feature_available_only_for_photos',
          'This feature available only for photos, it will add a default music that\n        you can change later.'
        )}
      </div>
      <hr className="mb-[15px] border-tableBorder" />
      <div className="text-[14px] mb-[10px]">
        {t('allow_user_to', 'Allow User To:')}
      </div>
      <div className="flex gap-[40px]">
        <Checkbox
          label={t('label_comments', 'Comments')}
          variant="hollow"
          disabled={isUploadMode}
          {...register('comment', {
            value: true,
          })}
        />
        <Checkbox
          variant="hollow"
          label={t('label_duet', 'Duet')}
          disabled={isUploadMode}
          {...register('duet', {
            value: false,
          })}
        />
        <Checkbox
          label={t('label_stitch', 'Stitch')}
          variant="hollow"
          disabled={isUploadMode}
          {...register('stitch', {
            value: false,
          })}
        />
      </div>
      <hr className="my-[15px] mb-[25px] border-tableBorder" />
      <div className="flex flex-col">
        <Checkbox
          variant="hollow"
          label={t('label_disclose_video_content', 'Disclose Video Content')}
          disabled={isUploadMode}
          {...register('disclose', {
            value: false,
          })}
        />
        {disclose && (
          <div className="bg-tableBorder p-[10px] mt-[10px] rounded-[10px] flex gap-[20px] items-center">
            <div>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.201 17.6335L14.0026 3.39569C13.7977 3.04687 13.5052 2.75764 13.1541 2.55668C12.803 2.35572 12.4055 2.25 12.001 2.25C11.5965 2.25 11.199 2.35572 10.8479 2.55668C10.4968 2.75764 10.2043 3.04687 9.99944 3.39569L1.80101 17.6335C1.60388 17.9709 1.5 18.3546 1.5 18.7454C1.5 19.1361 1.60388 19.5199 1.80101 19.8572C2.00325 20.2082 2.29523 20.499 2.64697 20.6998C2.99871 20.9006 3.39755 21.0043 3.80257 21.0001H20.1994C20.6041 21.0039 21.0026 20.9001 21.354 20.6993C21.7054 20.4985 21.997 20.2079 22.1991 19.8572C22.3965 19.52 22.5007 19.1364 22.5011 18.7456C22.5014 18.3549 22.3978 17.9711 22.201 17.6335ZM11.251 9.75006C11.251 9.55115 11.33 9.36038 11.4707 9.21973C11.6113 9.07908 11.8021 9.00006 12.001 9.00006C12.1999 9.00006 12.3907 9.07908 12.5313 9.21973C12.672 9.36038 12.751 9.55115 12.751 9.75006V13.5001C12.751 13.699 12.672 13.8897 12.5313 14.0304C12.3907 14.171 12.1999 14.2501 12.001 14.2501C11.8021 14.2501 11.6113 14.171 11.4707 14.0304C11.33 13.8897 11.251 13.699 11.251 13.5001V9.75006ZM12.001 18.0001C11.7785 18.0001 11.561 17.9341 11.376 17.8105C11.191 17.6868 11.0468 17.5111 10.9616 17.3056C10.8765 17.1 10.8542 16.8738 10.8976 16.6556C10.941 16.4374 11.0482 16.2369 11.2055 16.0796C11.3628 15.9222 11.5633 15.8151 11.7815 15.7717C11.9998 15.7283 12.226 15.7505 12.4315 15.8357C12.6371 15.9208 12.8128 16.065 12.9364 16.25C13.06 16.4351 13.126 16.6526 13.126 16.8751C13.126 17.1734 13.0075 17.4596 12.7965 17.6706C12.5855 17.8815 12.2994 18.0001 12.001 18.0001Z"
                  fill="white"
                />
              </svg>
            </div>
            <div>
              {t(
                'your_video_will_be_labeled_promotional',
                'Your video will be labeled "Promotional Content".'
              )}
              <br />
              {t(
                'this_cannot_be_changed_once_posted',
                'This cannot be changed once your video is posted.'
              )}
            </div>
          </div>
        )}
        <div className="text-[14px] my-[10px] text-balance">
          {t(
            'turn_on_to_disclose_video_promotes',
            'Turn on to disclose that this video promotes goods or services in\n          exchange for something of value. You video could promote yourself, a\n          third party, or both.'
          )}
        </div>
      </div>
      <div className={clsx(!disclose && 'invisible', 'mt-[20px]')}>
        <Checkbox
          variant="hollow"
          label={t('label_your_brand', 'Your brand')}
          disabled={isUploadMode}
          {...register('brand_organic_toggle', {
            value: false,
          })}
        />
        <div className="text-balance my-[10px] text-[14px]">
          {t(
            'you_are_promoting_yourself',
            'You are promoting yourself or your own brand.'
          )}
          <br />
          {t(
            'this_video_will_be_classified_brand_organic',
            'This video will be classified as Brand Organic.'
          )}
        </div>
        <Checkbox
          variant="hollow"
          label={t('label_branded_content', 'Branded content')}
          disabled={isUploadMode}
          {...register('brand_content_toggle', {
            value: false,
          })}
        />
        <div className="text-balance my-[10px] text-[14px]">
          {t(
            'you_are_promoting_another_brand',
            'You are promoting another brand or a third party.'
          )}
          <br />
          {t(
            'this_video_will_be_classified_branded_content',
            'This video will be classified as Branded Content.'
          )}
        </div>
        {(brand_organic_toggle || brand_content_toggle) && (
          <div className="my-[10px] text-[14px] text-balance">
            {t(
              'by_posting_you_agree_to_tiktoks',
              "By posting, you agree to TikTok's"
            )}
            {[
              brand_organic_toggle || brand_content_toggle ? (
                <a
                  target="_blank"
                  className="text-[#B69DEC] hover:underline"
                  href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
                >
                  {t('music_usage_confirmation', 'Music Usage Confirmation')}
                </a>
              ) : undefined,
              brand_content_toggle ? <> {t('and', 'and')} </> : undefined,
              brand_content_toggle ? (
                <a
                  target="_blank"
                  className="text-[#B69DEC] hover:underline"
                  href="https://www.tiktok.com/legal/page/global/bc-policy/en"
                >
                  {t('branded_content_policy', 'Branded Content Policy')}
                </a>
              ) : undefined,
            ].filter((f) => f)}
          </div>
        )}
      </div>
    </div>
  );
};
export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: TikTokSettings,
  CustomPreviewComponent: undefined,
  dto: TikTokDto,
  checkValidity: async (items) => {
    const [firstItems] = items;
    if (items.length !== 1) {
      return 'Should have one item';
    }
    if (firstItems.length === 0) {
      return 'No video / images selected';
    }
    if (
      firstItems.length > 1 &&
      firstItems?.some((p) => p?.path?.indexOf('mp4') > -1)
    ) {
      return 'Only pictures are supported when selecting multiple items';
    } else if (
      firstItems?.length !== 1 &&
      firstItems?.[0]?.path?.indexOf('mp4') > -1
    ) {
      return 'You need one media';
    }
    return true;
  },
  maximumCharacters: 2000,
});
