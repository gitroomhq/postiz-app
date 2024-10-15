import {
  FC,
  ReactEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { TikTokDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tiktok.dto';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Select } from '@gitroom/react/form/select';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { Checkbox } from '@gitroom/react/form/checkbox';
import clsx from 'clsx';

import { ReactComponent as WarningSvg } from '@gitroom/frontend/assets/warning.svg';

const privacyLevel = [
  {
    value: 'PUBLIC_TO_EVERYONE',
    label: 'Public to everyone',
  },
  {
    value: 'MUTUAL_FOLLOW_FRIENDS',
    label: 'Mutual follow friends',
  },
  {
    value: 'FOLLOWER_OF_CREATOR',
    label: 'Follower of creator',
  },
  {
    value: 'SELF_ONLY',
    label: 'Self only',
  },
];

const yesNo = [
  {
    value: 'true',
    label: 'Yes',
  },
  {
    value: 'false',
    label: 'No',
  },
];

const CheckTikTokValidity: FC<{ picture: string }> = (props) => {
  const { register } = useSettings();
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
          Video length is invalid, must be up to {maxVideoLength} seconds
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

const TikTokSettings: FC<{ values?: any }> = (props) => {
  const { watch, register, formState, control } = useSettings();
  const disclose = watch('disclose');
  const brand_organic_toggle = watch('brand_organic_toggle');
  const brand_content_toggle = watch('brand_content_toggle');

  return (
    <div className="flex flex-col">
      <CheckTikTokValidity picture={props?.values?.[0]?.image?.[0]?.path} />
      <Select
        label="Who can see this video?"
        {...register('privacy_level', {
          value: 'PUBLIC_TO_EVERYONE',
        })}
      >
        <option value="">Select</option>
        {privacyLevel.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
      <hr className="mb-[15px] border-tableBorder" />
      <div className="text-[14px] mb-[10px]">Allow User To:</div>
      <div className="flex gap-[40px]">
        <Checkbox
          variant="hollow"
          label="Duet"
          {...register('duet', {
            value: false,
          })}
        />
        <Checkbox
          label="Stitch"
          variant="hollow"
          {...register('stitch', {
            value: false,
          })}
        />
        <Checkbox
          label="Comments"
          variant="hollow"
          {...register('comment', {
            value: false,
          })}
        />
      </div>
      <hr className="my-[15px] mb-[25px] border-tableBorder" />
      <div className="flex flex-col">
        <Checkbox
          variant="hollow"
          label="Disclose Video Content"
          {...register('disclose', {
            value: false,
          })}
        />
        {disclose && (
          <div className="bg-tableBorder p-[10px] mt-[10px] rounded-[10px] flex gap-[20px] items-center">
            <div>
              <WarningSvg />
            </div>
            <div>
              Your video will be labeled {'"'}Promotional Content{'"'}.<br />
              This cannot be changed once your video is posted.
            </div>
          </div>
        )}
        <div className="text-[14px] my-[10px] text-balance">
          Turn on to disclose that this video promotes good or services in
          exchange for something of value. You video could promote yourself, a
          third party, or both.
        </div>
      </div>

      <div className={clsx(!disclose && 'invisible', 'mt-[20px]')}>
        <Checkbox
          variant="hollow"
          label="Your brand"
          {...register('brand_organic_toggle', {
            value: false,
          })}
        />
        <div className="text-balance my-[10px] text-[14px]">
          You are promoting yourself or your own brand.
          <br />
          This video will be classified as Brand Organic.
        </div>
        <Checkbox
          variant="hollow"
          label="Branded content"
          {...register('brand_content_toggle', {
            value: false,
          })}
        />
        <div className="text-balance my-[10px] text-[14px]">
          You are promoting another brand or a third party.
          <br />
          This video will be classified as Branded Content.
        </div>
        {(brand_organic_toggle || brand_content_toggle) && (
          <div className="my-[10px] text-[14px] text-balance">
            By posting, you agree to TikTok{"'"}s{' '}
            {[
              brand_organic_toggle || brand_content_toggle ? (
                <a
                  target="_blank"
                  className="text-[#B69DEC] hover:underline"
                  href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
                >
                  Music Usage Confirmation
                </a>
              ) : undefined,
              brand_content_toggle ? <> and </> : undefined,
              brand_content_toggle ? (
                <a
                  target="_blank"
                  className="text-[#B69DEC] hover:underline"
                  href="https://www.tiktok.com/legal/page/global/bc-policy/en"
                >
                  Branded Content Policy
                </a>
              ) : undefined,
            ].filter((f) => f)}
          </div>
        )}
      </div>
    </div>
  );
};

export default withProvider(
  TikTokSettings,
  undefined,
  TikTokDto,
  async (items) => {
    const [firstItems] = items;

    if (items.length !== 1) {
      return 'Tiktok items should be one';
    }

    if (items[0].length !== 1) {
      return 'You need one media';
    }

    if (firstItems[0].path.indexOf('mp4') === -1) {
      return 'Item must be a video';
    }

    return true;
  },
  2200
);
