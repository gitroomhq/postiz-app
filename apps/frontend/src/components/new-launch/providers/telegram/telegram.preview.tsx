'use client';

import { FC } from 'react';
import clsx from 'clsx';
import { useFormContext, useWatch } from 'react-hook-form';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// What the subscribers get: the media first unless the settings put the text
// first, the media blurred behind a spoiler. The general preview always puts
// the media under the text.
export const TelegramPreview: FC<{
  maximumCharacters?: number;
}> = () => {
  const t = useT();
  const { value, integration } = useIntegration();
  const mediaDir = useMediaDirectory();
  const { control } = useFormContext();
  const settings = useWatch({ control });
  const textFirst = settings?.media_position === 'bottom';
  const spoiler = !!settings?.has_spoiler;

  return (
    <div className="telegram-preview w-full p-[15px] flex flex-col gap-[12px]">
      {value.map((p, index) => {
        const text = stripHtmlValidation('normal', p.content || '', true);
        const media = p.image || [];
        const textBlock = !!text && (
          <div
            dir="auto"
            className="text-[15px] whitespace-pre-wrap break-words"
          >
            {text}
          </div>
        );
        const mediaBlock = !!media.length && (
          <div
            className={clsx(
              'w-full rounded-[8px] overflow-hidden',
              media.length > 1 ? 'grid grid-cols-2 gap-[2px]' : 'flex',
              spoiler && 'blur-md'
            )}
          >
            {media.map((image) => (
              <VideoOrImage
                key={image.id}
                autoplay={false}
                src={mediaDir.set(image.path)}
              />
            ))}
          </div>
        );

        return (
          <div
            key={`telegram_${index}`}
            className={clsx(
              'flex flex-col gap-[8px] rounded-[12px] bg-newBgColorInner p-[10px]',
              index > 0 && 'ms-[24px]'
            )}
          >
            <div className="text-[13px] font-[600] text-customColor26">
              {integration?.name}
            </div>
            {textFirst ? textBlock : mediaBlock}
            {textFirst ? mediaBlock : textBlock}
            {!!settings?.protect_content && (
              <div className="text-[11px] text-customColor27">
                {t('telegram_preview_protected', 'Protected content')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
