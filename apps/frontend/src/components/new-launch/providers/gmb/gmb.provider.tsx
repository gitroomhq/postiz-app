'use client';

import { FC, useCallback, useEffect } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { GmbSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/gmb.settings.dto';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { useWatch } from 'react-hook-form';

const topicTypes = [
  {
    label: 'Standard Update',
    value: 'STANDARD',
  },
  {
    label: 'Event',
    value: 'EVENT',
  },
  {
    label: 'Offer',
    value: 'OFFER',
  },
];

const callToActionTypes = [
  {
    label: 'None',
    value: 'NONE',
  },
  {
    label: 'Book',
    value: 'BOOK',
  },
  {
    label: 'Order Online',
    value: 'ORDER',
  },
  {
    label: 'Shop',
    value: 'SHOP',
  },
  {
    label: 'Learn More',
    value: 'LEARN_MORE',
  },
  {
    label: 'Sign Up',
    value: 'SIGN_UP',
  },
  {
    label: 'Get Offer',
    value: 'GET_OFFER',
  },
  {
    label: 'Call',
    value: 'CALL',
  },
];

const GmbSettings: FC = () => {
  const { register, control } = useSettings();
  const topicType = useWatch({ control, name: 'topicType' });
  const callToActionType = useWatch({ control, name: 'callToActionType' });

  return (
    <div className="flex flex-col gap-[10px]">
      <Select
        label="Post Type"
        {...register('topicType', {
          value: 'STANDARD',
        })}
      >
        {topicTypes.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>

      <Select
        label="Call to Action"
        {...register('callToActionType', {
          value: 'NONE',
        })}
      >
        {callToActionTypes.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>

      {callToActionType &&
        callToActionType !== 'NONE' &&
        callToActionType !== 'CALL' && (
          <Input
            label="Call to Action URL"
            placeholder="https://example.com"
            {...register('callToActionUrl')}
          />
        )}

      {topicType === 'EVENT' && (
        <div className="flex flex-col gap-[10px] mt-[10px] p-[15px] border border-input rounded-[8px]">
          <div className="text-[14px] font-medium mb-[5px]">Event Details</div>
          <Input
            label="Event Title"
            placeholder="Event name"
            {...register('eventTitle')}
          />
          <div className="grid grid-cols-2 gap-[10px]">
            <Input
              label="Start Date"
              type="date"
              {...register('eventStartDate')}
            />
            <Input label="End Date" type="date" {...register('eventEndDate')} />
          </div>
          <div className="grid grid-cols-2 gap-[10px]">
            <Input
              label="Start Time (optional)"
              type="time"
              {...register('eventStartTime')}
            />
            <Input
              label="End Time (optional)"
              type="time"
              {...register('eventEndTime')}
            />
          </div>
        </div>
      )}

      {topicType === 'OFFER' && (
        <div className="flex flex-col gap-[10px] mt-[10px] p-[15px] border border-input rounded-[8px]">
          <div className="text-[14px] font-medium mb-[5px]">Offer Details</div>
          <Input
            label="Coupon Code (optional)"
            placeholder="SAVE20"
            {...register('offerCouponCode')}
          />
          <Input
            label="Redeem Online URL (optional)"
            placeholder="https://example.com/redeem"
            {...register('offerRedeemUrl')}
          />
          <Input
            label="Terms & Conditions (optional)"
            placeholder="Valid until..."
            {...register('offerTerms')}
          />
        </div>
      )}
    </div>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: GmbSettings,
  CustomPreviewComponent: undefined,
  dto: GmbSettingsDto,
  checkValidity: async (items, settings: any) => {
    // GMB posts can have text only, or text with one image
    if ((items?.length ?? 0) > 0 && (items?.[0]?.length ?? 0) > 1) {
      return 'Google My Business posts can only have one image';
    }

    // Check for video - GMB doesn't support video in local posts
    if ((items?.length ?? 0) > 0 && (items?.[0]?.length ?? 0) > 0) {
      const media = items?.[0]?.[0];
      if ((media?.path?.indexOf?.('mp4') ?? -1) > -1) {
        return 'Google My Business posts do not support video attachments';
      }
    }

    // Event posts require a title
    if (settings?.topicType === 'EVENT' && !settings?.eventTitle) {
      return 'Event posts require an event title';
    }

    return true;
  },
  maximumCharacters: 1500,
});
