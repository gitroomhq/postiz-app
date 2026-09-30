'use client';

// postmonster: TikTok Direct Post settings panel (PRD 8.2, TT-01..TT-11, TT-17,
// TT-18, TT-22). Texts come from the Content Sharing Guidelines or PRD 8.2.

import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { TikTokDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tiktok.dto';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Select } from '@gitroom/react/form/select';
import { Checkbox } from '@gitroom/react/form/checkbox';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { isTikTokVideoPath } from '@gitroom/nestjs-libraries/postmonster/tiktok/tiktok.validation';
import { Input } from '@gitroom/react/form/input';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { TiktokPreview } from '@gitroom/frontend/components/new-launch/providers/tiktok/tiktok.preview';
import { TikTokMusicSelector } from '@gitroom/frontend/components/new-launch/providers/tiktok/tiktok.music';
import { TikTokLocationSelector } from '@gitroom/frontend/components/new-launch/providers/tiktok/tiktok.location';
import {
  computeTikTokBlockers,
  resolveBrandedPrivacySwitch,
  tikTokPrivacyLabel,
  useTikTokGate,
} from '@gitroom/frontend/components/new-launch/providers/tiktok/tiktok.gate';

interface CreatorState {
  loading: boolean;
  creator?: {
    creator_avatar_url: string;
    creator_username: string;
    creator_nickname: string;
    privacy_level_options: string[];
    comment_disabled: boolean;
    duet_disabled: boolean;
    stitch_disabled: boolean;
    max_video_post_duration_sec: number;
  } | null;
  canPost: boolean;
  message?: string;
  reconnect?: boolean;
}

const AUDITED =
  String(process.env.NEXT_PUBLIC_TIKTOK_AUDITED || '').toLowerCase() === 'true';

export const TikTokSettings: FC<{
  values?: any;
}> = () => {
  const { watch, register, setValue } = useSettings();
  const { value, integration } = useIntegration();
  const fetch = useFetch();
  const t = useT();
  const toaster = useToaster();
  const setBlockers = useTikTokGate((state) => state.setBlockers);

  // Music and location come from the Business API (v1.3) - the reviewed
  // Content Posting API used by the "tiktok" identifier has no such fields.
  const isBusiness = integration?.identifier === 'tiktok-business';

  const isTitle = useMemo(() => {
    return value?.[0]?.image?.some((p) => !isTikTokVideoPath(p?.path));
  }, [value]);
  const hasMedia = (value?.[0]?.image?.length ?? 0) > 0;
  const isVideo = hasMedia && !isTitle;
  const videoPath = isVideo ? value?.[0]?.image?.[0]?.path : undefined;

  const privacy = watch('privacy_level');
  const disclose = watch('disclose');
  const brand_organic_toggle = watch('brand_organic_toggle');
  const brand_content_toggle = watch('brand_content_toggle');
  const comment = watch('comment');
  const duet = watch('duet');
  const stitch = watch('stitch');
  const photoTitle = watch('title');

  // TT-01: creator info drives the whole panel - avatar/nickname/@username,
  // the privacy options, the interaction switches and the duration limit.
  const [creatorState, setCreatorState] = useState<CreatorState>({
    loading: true,
    canPost: true,
    creator: null,
  });

  const loadCreator = useCallback(async () => {
    if (!integration?.id) return;
    setCreatorState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await (
        await fetch(`/integrations/tiktok/${integration.id}/creator-info`)
      ).json();
      setCreatorState({
        loading: false,
        creator: response?.creator || null,
        canPost: response?.canPost !== false,
        message: response?.message,
        reconnect: !!response?.reconnect,
      });
    } catch {
      setCreatorState({
        loading: false,
        creator: null,
        canPost: true,
        message: 'Could not load TikTok account info. Please try again.',
      });
    }
  }, [integration?.id]);

  useEffect(() => {
    loadCreator();
  }, [loadCreator]);

  // TT-03 / TT-16: the video duration is measured here and revalidated by the
  // backend against the account's max_video_post_duration_sec at publish time.
  useEffect(() => {
    if (!isVideo || !videoPath) {
      setValue('videoDurationSec', undefined);
      return;
    }
    const element = document.createElement('video');
    element.preload = 'metadata';
    element.onloadedmetadata = () => {
      const duration = Math.round(element.duration || 0);
      if (duration > 0) {
        setValue('videoDurationSec', duration);
      }
    };
    element.src = videoPath;
    return () => {
      element.onloadedmetadata = null;
    };
  }, [isVideo, videoPath, setValue]);

  const creator = creatorState.creator || undefined;
  const privacyOptions = creator?.privacy_level_options || [];

  // TT-22: while unaudited only private (Only me) posts are allowed.
  const allowedPrivacy = useMemo(() => {
    if (isBusiness) {
      return privacyOptions;
    }
    return AUDITED ? privacyOptions : ['SELF_ONLY'];
  }, [privacyOptions, isBusiness]);

  // TT-10: Branded content can never be private. When it is checked while
  // SELF_ONLY is selected, visibility switches to the most open available
  // option and the user is told (variant B of the guidelines).
  useEffect(() => {
    const { nextPrivacy, notice } = resolveBrandedPrivacySwitch(
      privacy,
      brand_content_toggle,
      privacyOptions
    );
    if (!nextPrivacy) return;
    setValue('privacy_level', nextPrivacy);
    if (notice) {
      toaster.show(notice);
    }
  }, [brand_content_toggle, privacy, privacyOptions, setValue, toaster]);

  // What is still missing before this post can be published - the publish
  // buttons in the composer footer stay disabled while this list is non-empty.
  const blockers = useMemo(
    () =>
      computeTikTokBlockers({
        loading: creatorState.loading,
        reconnect: !!creatorState.reconnect,
        canPost: creatorState.canPost,
        message: creatorState.message,
        creator: creator || null,
        hasMedia,
        isVideo,
        isPhotoTitle: isTitle,
        privacy,
        photoTitle,
        disclose,
        brandOrganic: brand_organic_toggle,
        brandContent: brand_content_toggle,
        videoDurationSec: watch('videoDurationSec'),
      }),
    [
      creatorState,
      creator,
      hasMedia,
      isVideo,
      isTitle,
      privacy,
      photoTitle,
      disclose,
      brand_organic_toggle,
      brand_content_toggle,
      watch,
    ]
  );

  useEffect(() => {
    if (!integration?.id) return;
    setBlockers(integration.id, blockers);
    return () => {
      setBlockers(integration.id, []);
    };
  }, [integration?.id, blockers, setBlockers]);

  const commentDisabled = !!creator?.comment_disabled;
  const duetDisabled = !!creator?.duet_disabled;
  const stitchDisabled = !!creator?.stitch_disabled;
  const brandedLocked = !AUDITED && !isBusiness;

  return (
    <div className="flex flex-col">
      {/* TT-18: unaudited notice */}
      {!AUDITED && !isBusiness && (
        <div className="bg-tableBorder border border-borderPreview p-[10px] mb-[16px] rounded-[10px] text-[13px] text-balance">
          {t(
            'tiktok_unaudited_notice',
            "While Postmonster's TikTok integration is under review, posts are published as private (Only me)."
          )}
        </div>
      )}

      {/* TT-01: Posting to */}
      <div className="mb-[16px]">
        <div className="text-[14px] font-[600] mb-[8px]">
          {t('posting_to', 'Posting to')}
        </div>
        {creatorState.loading && (
          <div
            className="flex items-center gap-[10px] animate-pulse"
            aria-busy="true"
          >
            <div className="w-[42px] h-[42px] rounded-full bg-tableBorder" />
            <div className="flex flex-col gap-[6px]">
              <div className="w-[120px] h-[12px] rounded bg-tableBorder" />
              <div className="w-[80px] h-[10px] rounded bg-tableBorder" />
            </div>
          </div>
        )}
        {!creatorState.loading && (creatorState.reconnect || !creator) && (
          <div className="flex items-center gap-[10px]">
            <div className="text-[13px] text-balance">
              {creatorState.message ||
                t(
                  'tiktok_creator_load_failed',
                  'Could not load TikTok account info. Please try again.'
                )}
            </div>
            <button
              type="button"
              onClick={loadCreator}
              className="underline text-[13px]"
            >
              {creatorState.reconnect
                ? t('reconnect_tiktok', 'Reconnect TikTok channel')
                : t('retry', 'Retry')}
            </button>
            {creatorState.reconnect && (
              <a href="/settings" className="underline text-[13px]">
                {t('open_channels', 'Open Channels')}
              </a>
            )}
          </div>
        )}
        {!creatorState.loading && creator && (
          <div className="flex items-center gap-[10px]">
            {creator.creator_avatar_url ? (
              <img
                src={creator.creator_avatar_url}
                alt={creator.creator_nickname}
                className="w-[42px] h-[42px] rounded-full"
              />
            ) : (
              <div className="w-[42px] h-[42px] rounded-full bg-tableBorder" />
            )}
            <div className="flex flex-col">
              <div className="text-[15px] font-[600]">
                {creator.creator_nickname}
              </div>
              <div className="text-[13px]">@{creator.creator_username}</div>
            </div>
          </div>
        )}
      </div>

      {/* TT-02: can not post right now */}
      {!creatorState.loading && !creatorState.canPost && (
        <div className="bg-tableBorder p-[10px] mb-[16px] rounded-[10px] text-[13px] text-balance">
          {creatorState.message ||
            t(
              'tiktok_cant_post',
              "This TikTok account can't publish more posts right now. Please try again later."
            )}
        </div>
      )}

      {/* TT-23: photo title */}
      {isTitle && (
        <div className="mb-[12px]">
          <Input
            label={t('tiktok_photo_title', 'Title')}
            {...register('title')}
            maxLength={90}
            aria-describedby="tiktok-title-hint"
          />
          <div id="tiktok-title-hint" className="text-[12px] mt-[4px]">
            {(photoTitle?.length ?? 0)}/90
          </div>
        </div>
      )}

      {/* TT-05: privacy - options only from creator info, no default */}
      <div className="mb-[12px]">
        <Select
          label={t('who_can_view_this_post', 'Who can view this post')}
          disabled={!creator || creatorState.loading}
          {...register('privacy_level')}
          aria-describedby="tiktok-privacy-hint"
        >
          <option value="">
            {t('select_privacy', 'Select privacy')}
          </option>
          {[
            'PUBLIC_TO_EVERYONE',
            'MUTUAL_FOLLOW_FRIENDS',
            'FOLLOWER_OF_CREATOR',
            'SELF_ONLY',
          ].map((option) => {
            const available = allowedPrivacy.indexOf(option) > -1;
            return (
              <option
                key={option}
                value={option}
                disabled={!available}
                title={
                  option === 'SELF_ONLY' && brand_content_toggle
                    ? 'Branded content visibility cannot be set to private.'
                    : undefined
                }
              >
                {tikTokPrivacyLabel(option)}
              </option>
            );
          })}
        </Select>
        {brand_content_toggle && (
          <div
            id="tiktok-privacy-hint"
            className="text-[12px] mt-[4px] text-balance"
          >
            {t(
              'branded_private_hint',
              'Branded content visibility cannot be set to private.'
            )}
          </div>
        )}
      </div>

      {/* TT-06: interactions - all off by default, disabled when the account
          disabled them; photo posts only take comments */}
      <div className="mb-[12px]">
        <div className="text-[14px] font-[600] mb-[8px]">
          {t('interactions', 'Interactions')}
        </div>
        <div className={clsx('flex flex-col gap-[8px]', isVideo && 'flex-row gap-[40px]')}>
          <Checkbox
            variant="hollow"
            label={t('label_comments', 'Allow Comments')}
            disabled={commentDisabled}
            title={
              commentDisabled
                ? "Disabled in this account's TikTok settings"
                : undefined
            }
            aria-describedby={commentDisabled ? 'tiktok-comment-hint' : undefined}
            {...register('comment', { value: false })}
          />
          {commentDisabled && (
            <div id="tiktok-comment-hint" className="text-[12px]">
              {t(
                'disabled_in_account_settings',
                "Disabled in this account's TikTok settings"
              )}
            </div>
          )}
          {isVideo && (
            <>
              <Checkbox
                variant="hollow"
                label={t('label_duet', 'Allow Duet')}
                disabled={duetDisabled}
                title={
                  duetDisabled
                    ? "Disabled in this account's TikTok settings"
                    : undefined
                }
                {...register('duet', { value: false })}
              />
              <Checkbox
                variant="hollow"
                label={t('label_stitch', 'Allow Stitch')}
                disabled={stitchDisabled}
                title={
                  stitchDisabled
                    ? "Disabled in this account's TikTok settings"
                    : undefined
                }
                {...register('stitch', { value: false })}
              />
            </>
          )}
        </div>
      </div>

      {/* TT-07: commercial content disclosure - off by default */}
      <div className="mb-[12px]">
        <Checkbox
          variant="hollow"
          label={t('disclose_post_content', 'Disclose post content')}
          {...register('disclose', { value: false })}
        />
        <div className="text-[13px] mt-[6px] text-balance">
          {t(
            'disclose_explanation',
            'Turn on to disclose that this post promotes goods or services in exchange for something of value. Your post could promote yourself, a third party, or both.'
          )}
        </div>
        {disclose && (
          <div className="flex flex-col gap-[12px] mt-[12px]">
            <div>
              <Checkbox
                variant="hollow"
                label={t('label_your_brand', 'Your brand')}
                {...register('brand_organic_toggle', { value: false })}
              />
              <div className="text-[13px] mt-[4px] text-balance">
                {t(
                  'you_are_promoting_yourself',
                  'You are promoting yourself or your own business.'
                )}
                {brand_organic_toggle && (
                  <>
                    <br />
                    {t(
                      'labeled_promotional',
                      "Your photo/video will be labeled as 'Promotional content'."
                    )}
                  </>
                )}
              </div>
            </div>
            <div>
              <Checkbox
                variant="hollow"
                label={t('label_branded_content', 'Branded content')}
                disabled={brandedLocked}
                title={
                  brandedLocked
                    ? "While Postmonster's TikTok integration is under review, Branded content is not available."
                    : undefined
                }
                {...register('brand_content_toggle', { value: false })}
              />
              <div className="text-[13px] mt-[4px] text-balance">
                {t(
                  'you_are_promoting_another_brand',
                  'You are promoting another brand or a third party.'
                )}
                {brand_content_toggle && (
                  <>
                    <br />
                    {t(
                      'labeled_paid_partnership',
                      "Your photo/video will be labeled as 'Paid partnership'."
                    )}
                  </>
                )}
              </div>
            </div>
            {/* TT-08 */}
            {!brand_organic_toggle && !brand_content_toggle && (
              <div
                id="tiktok-disclosure-hint"
                className="text-[13px] text-balance"
              >
                {t(
                  'need_to_indicate',
                  'You need to indicate if your content promotes yourself, a third party, or both.'
                )}
              </div>
            )}
            {/* TT-09: both selected -> Paid partnership */}
            {brand_organic_toggle && brand_content_toggle && (
              <div className="text-[13px] text-balance">
                {t(
                  'labeled_paid_partnership',
                  "Your photo/video will be labeled as 'Paid partnership'."
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* TikTok Business only extras */}
      {isBusiness && (
        <div className="flex flex-col gap-[18px] mb-[24px]">
          <TikTokMusicSelector
            label={t('tiktok_music_label', 'Music')}
            showVolumes={isVideo}
            {...register('music')}
          />
          <TikTokLocationSelector
            label={t('tiktok_location_label', 'Location')}
            {...register('location')}
          />
        </div>
      )}

      {/* TT-11: legal declaration, right above the publish buttons */}
      <div className="mt-[8px] text-[13px] text-balance">
        {brand_content_toggle ? (
          <>
            {t('by_posting_you_agree', "By posting, you agree to TikTok's")}{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              href="https://www.tiktok.com/legal/page/global/bc-policy/en"
            >
              {t('branded_content_policy', 'Branded Content Policy')}
            </a>{' '}
            {t('and', 'and')}{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
            >
              {t('music_usage_confirmation', 'Music Usage Confirmation')}
            </a>
            .
          </>
        ) : (
          <>
            {t('by_posting_you_agree', "By posting, you agree to TikTok's")}{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
            >
              {t('music_usage_confirmation', 'Music Usage Confirmation')}
            </a>
            .
          </>
        )}
      </div>

      {/* what is still missing */}
      {blockers.length > 0 && (
        <div className="mt-[12px] text-[13px]">
          <div className="font-[600] mb-[4px]">
            {t('to_publish', 'To publish:')}
          </div>
          <ul className="list-disc ps-[18px] flex flex-col gap-[2px]">
            {blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: TikTokSettings,
  comments: false,
  CustomPreviewComponent: TiktokPreview,
  dto: TikTokDto,
  maximumCharacters: 2200,
});
