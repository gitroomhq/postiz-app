import { FC } from 'react';
import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { TikTokDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tiktok.dto';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Select } from '@gitroom/react/form/select';

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

const TikTokSettings: FC = () => {
  const { register, control } = useSettings();
  return (
    <div className="flex flex-col">
      <Select
        label="Privacy Level"
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
      <Select
        label="Disable Duet"
        {...register('disable_duet', {
          value: 'false',
          setValueAs: (value) => value === 'true',
        })}
      >
        <option value="">Select</option>
        {yesNo.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
      <Select
        label="Disable Stitch"
        {...register('disable_stitch', {
          value: 'false',
          setValueAs: (value) => value === 'true',
        })}
      >
        <option value="">Select</option>
        {yesNo.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>

      <Select
        label="Disable Comments"
        {...register('disable_comment', {
          value: 'false',
          setValueAs: (value) => value === 'true',
        })}
      >
        <option value="">Select</option>
        {yesNo.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>

      <Select
        label="Is Partnership?"
        {...register('brand_content_toggle', {
          value: 'false',
          setValueAs: (value) => value === 'true',
        })}
      >
        <option value="">Select</option>
        {yesNo.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>

      <Select
        label="For my brand?"
        {...register('brand_organic_toggle', {
          value: 'true',
          setValueAs: (value) => value === 'true',
        })}
      >
        <option value="">Select</option>
        {yesNo.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
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
