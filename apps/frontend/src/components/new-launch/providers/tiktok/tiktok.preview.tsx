// postmonster: TikTok preview (PRD TT-12) - a vertical phone frame showing
// exactly what will be posted: media, caption, the account and the chosen
// settings (visibility, interactions, disclosure label). The upstream fake
// engagement counters were removed: PRD forbids fake metrics.
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { textSlicer } from '@gitroom/helpers/utils/count.length';
import { FC } from 'react';
import { SliderComponent } from '@gitroom/frontend/components/third-parties/slider.component';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { isTikTokVideoPath } from '@gitroom/nestjs-libraries/postmonster/tiktok/tiktok.validation';
import { tikTokPrivacyLabel } from '@gitroom/frontend/components/new-launch/providers/tiktok/tiktok.gate';

export const TiktokPreview: FC<{
  maximumCharacters?: number;
}> = (props) => {
  const { value: topValue, integration } = useIntegration();
  const mediaDir = useMediaDirectory();
  const { watch } = useSettings();

  const privacy = watch('privacy_level');
  const comment = watch('comment');
  const duet = watch('duet');
  const stitch = watch('stitch');
  const disclose = watch('disclose');
  const brand_organic_toggle = watch('brand_organic_toggle');
  const brand_content_toggle = watch('brand_content_toggle');

  const renderContent = topValue.map((p) => {
    const newContent = stripHtmlValidation(
      'normal',
      p.content.replace(
        /<span.*?data-mention-id="([.\s\S]*?)"[.\s\S]*?>([.\s\S]*?)<\/span>/gi,
        (match, match1, match2) => {
          return `[[[${match2}]]]`;
        }
      ),
      true
    );

    const { start, end } = textSlicer(
      integration?.identifier || '',
      props.maximumCharacters || 10000,
      newContent
    );

    const finalValue =
      newContent
        .slice(start, end)
        .replace(/\[\[\[([\s\S]*?)\]\]\]/, (match, match1) => {
          return `<span class="font-bold font-[arial]" style="color: #ae8afc">${match1}</span>`;
        }) +
      `<mark class="bg-red-500" data-tooltip-id="tooltip" data-tooltip-content="This text will be cropped">` +
      newContent.slice(end).replace(/\[\[\[([\s\S]*?)\]\]\]/, (match, match1) => {
        return `<span class="font-bold font-[arial]" style="color: #ae8afc">${match1}</span>`;
      }) +
      `</mark>`;

    return { text: finalValue, images: p.image };
  });

  const disclosureLabel = !disclose
    ? null
    : brand_content_toggle
      ? "Labeled as 'Paid partnership'"
      : brand_organic_toggle
        ? "Labeled as 'Promotional content'"
        : 'Disclosure on (not selected yet)';

  return (
    <div className="p-[15px] absolute left-0 top-0 w-full h-full flex justify-center bg-newBgColorInner">
      <div className="relative">
        <SliderComponent
          list={renderContent?.[0]?.images.map((image, index) => (
            <a
              key={`image_${index}`}
              className="flex-1"
              href={mediaDir.set(image.path)}
              target="_blank"
            >
              <VideoOrImage autoplay={true} src={mediaDir.set(image.path)} />
            </a>
          ))}
          className="h-full bg-black aspect-[calc(9/16)] rounded-[3px] overflow-hidden"
        />
        <div className="absolute pointer-events-none w-full h-full start-0 top-0 px-[12px] py-[25px] justify-between items-start text-white flex flex-col">
          {/* TT-12: the account the post goes to */}
          <div className="flex items-center gap-[8px]">
            <img
              src={integration?.picture || '/no-picture.jpg'}
              alt={integration?.name || 'TikTok account'}
              className="rounded-full w-[29px] h-[29px]"
            />
            <div className="text-[14px] font-[500]">{integration?.name}</div>
          </div>
          <div className="w-full">
            <div
              className="text-[13px] font-[400] whitespace-pre-line line-clamp-6 w-full"
              dangerouslySetInnerHTML={{ __html: renderContent?.[0]?.text || '' }}
            />
          </div>
        </div>
      </div>
      {/* TT-12: the settings that will be sent */}
      <div className="flex flex-col justify-end gap-[8px] ml-[18px] text-[13px] min-w-[170px]">
        <div className="font-[600]">This post</div>
        <div>Visibility: {tikTokPrivacyLabel(privacy)}</div>
        <div>
          Comments: {comment ? 'on' : 'off'}
          {topValue?.[0]?.image?.some((p: any) => isTikTokVideoPath(p?.path))
            ? ` · Duet: ${duet ? 'on' : 'off'} · Stitch: ${stitch ? 'on' : 'off'}`
            : ''}
        </div>
        {disclosureLabel && <div>{disclosureLabel}</div>}
      </div>
    </div>
  );
};
