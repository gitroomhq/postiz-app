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
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const GmbSettings: FC = () => {
  const t = useT();
  const { register, control } = useSettings();

  const topicTypes = [
    { label: t('standard_update', 'Standard Update'), value: 'STANDARD' },
    { label: t('event', 'Event'), value: 'EVENT' },
    { label: t('offer', 'Offer'), value: 'OFFER' },
  ];

  const callToActionTypes = [
    { label: t('none', 'None'), value: 'NONE' },
    { label: t('book', 'Book'), value: 'BOOK' },
    { label: t('order_online', 'Order Online'), value: 'ORDER' },
    { label: t('shop', 'Shop'), value: 'SHOP' },
    { label: t('learn_more', 'Learn More'), value: 'LEARN_MORE' },
    { label: t('sign_up', 'Sign Up'), value: 'SIGN_UP' },
    { label: t('get_offer', 'Get Offer'), value: 'GET_OFFER' },
    { label: t('call', 'Call'), value: 'CALL' },
  ];
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
          <div className="text-[14px] font-medium mb-[5px]">{t('event_details', 'Event Details')}</div>
          <Input
            label="Event Title"
            placeholder={t('event_name', 'Event name')}
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
          <div className="text-[14px] font-medium mb-[5px]">{t('offer_details', 'Offer Details')}</div>
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
            placeholder={t('valid_until', 'Valid until...')}
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
  maximumCharacters: 1500,
});
