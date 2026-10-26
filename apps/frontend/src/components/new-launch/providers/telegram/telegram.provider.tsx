'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Select } from '@gitroom/react/form/select';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { TelegramDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/telegram.dto';
import { TelegramPreview } from '@gitroom/frontend/components/new-launch/providers/telegram/telegram.preview';

const SettingsComponent = () => {
  const t = useT();
  const { register } = useSettings();

  return (
    <>
      <Select
        label={t('label_telegram_media_position', 'Media position')}
        className="mb-5"
        hideErrors={true}
        {...register('media_position', {
          value: 'top',
        })}
      >
        <option value="top">
          {t(
            'label_telegram_media_top',
            'Media first, text under it (Telegram default)'
          )}
        </option>
        <option value="bottom">
          {t('label_telegram_media_bottom', 'Text first, media under it')}
        </option>
      </Select>

      <div className="flex flex-col gap-[10px]">
        <Checkbox
          label={t(
            'label_telegram_has_spoiler',
            'Hide the media behind a spoiler'
          )}
          {...register('has_spoiler')}
        />
        <Checkbox
          label={t(
            'label_telegram_protect_content',
            'Protect content: no forwarding and saving'
          )}
          {...register('protect_content')}
        />
      </div>
    </>
  );
};

export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: SettingsComponent,
  CustomPreviewComponent: TelegramPreview,
  dto: TelegramDto,
  maximumCharacters: 4096,
});
