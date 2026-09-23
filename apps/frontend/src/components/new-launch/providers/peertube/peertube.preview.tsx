import { FC } from 'react';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { textSlicer } from '@gitroom/helpers/utils/count.length';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';
import { useFormContext, useWatch } from 'react-hook-form';

const PRIVACY_LABEL: Record<number, string> = {
  1: 'Public',
  2: 'Unlisted',
  3: 'Private',
};

export const PeertubePreview: FC<{
  maximumCharacters?: number;
}> = (props) => {
  const { value: topValue, integration } = useIntegration();
  const { set } = useMediaDirectory();
  const { control } = useFormContext();

  const title = useWatch({ control, name: 'title' });
  const privacy = useWatch({ control, name: 'privacy' });
  const nsfw = useWatch({ control, name: 'nsfw' });

  const renderContent = topValue.map((p) => {
    const newContent = stripHtmlValidation(
      'markdown',
      p.content.replace(
        /<span.*?data-mention-id="([.\s\S]*?)"[.\s\S]*?>([.\s\S]*?)<\/span>/gi,
        (match2) => {
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
        .replace(/\[\[\[([.\s\S]*?)]]]/, (match, match1) => {
          return `<span class="font-bold font-[arial]" style="color: #FD9C50">${match1}</span>`;
        }) +
      `<mark class="bg-red-500" data-tooltip-id="tooltip" data-tooltip-content="This text will be cropped">` +
      newContent.slice(end).replace(/\[\[\[([.\s\S]*?)]]]/, (match, match1) => {
        return `<span class="font-bold font-[arial]" style="color: #FD9C50">${match1}</span>`;
      }) +
      `</mark>`;

    return { text: finalValue, images: p.image };
  });

  const platformHost = (() => {
    try {
      return new URL(integration?.picture || '').host || 'peertube.instance';
    } catch {
      return 'peertube.instance';
    }
  })();

  return (
    <div className="absolute left-0 top-0 gap-[12px] w-full h-full flex flex-col p-[16px] bg-[hsl(0,14%,7%)] text-[hsl(0,10%,96%)]">
      <div className="relative w-full aspect-[calc(16/9)] rounded-[4px] overflow-hidden bg-[hsl(0,14%,22%)]">
        {!!renderContent?.[0]?.images?.[0]?.path ? (
          <VideoOrImage
            imageClassName="w-full aspect-[calc(16/9)]"
            videoClassName="w-full aspect-[calc(16/9)] bg-black"
            autoplay={true}
            src={set(renderContent?.[0]?.images?.[0]?.path || '')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" stroke="#F2690D" strokeWidth="1.5" />
              <path d="M9.5 8.5L16 12L9.5 15.5V8.5Z" fill="#FD9C50" />
            </svg>
          </div>
        )}

        {/* show privacy and nsfw on top left corner of video preview */}
        {(!!privacy || !!nsfw) && (
          <div className="absolute top-[8px] left-[8px] flex gap-[6px]">
            {!!privacy && (
              <span className="bg-black/70 text-[11px] px-[8px] py-[3px] rounded-[4px]">
                {PRIVACY_LABEL[Number(privacy)] || 'Public'}
              </span>
            )}
            {!!nsfw && (
              <span className="bg-[#F2690D] text-[11px] px-[8px] py-[3px] rounded-[4px] font-[600]">
                NSFW
              </span>
            )}
          </div>
        )}
      </div>


      <div className="text-[15px] font-[600]">
        {title || 'Untitled video'}
      </div>

      {/* pfp, username,subscribe button */}
      <div className="flex items-center">
        <div className="flex flex-1 gap-[10px] items-center">
          <div>
            <img
            src={integration?.picture || '/no-picture.jpg'}
            alt="channel"
            className="rounded-full z-[2] w-[40px] h-[40px]"
          />
          </div>
          <div className="flex flex-col">
            <div className="text-[13px] font-[500]">
              {integration?.name || 'channel'}
              <span className="text-[hsl(0,10%,60%)] font-[400]">
                @{platformHost}
              </span>
            </div>
            <div className="text-[10px] text-[hsl(0,10%,60%)]">
              16.7M subscribers
            </div>
          </div>
        </div>
        <div className="h-[30px] px-[14px] text-[12px] font-[600] flex justify-center items-center bg-[#FD9C50] text-[#111] rounded-[16px]">
          Subscribe
        </div>
      </div>

      {/* views, likes, dislikes and share */}
      <div className="flex items-center gap-[16px] text-[hsl(0,10%,80%)]">
        <div className="flex items-center gap-[6px] text-[12px]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path
              d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          1M views
        </div>
        <div className="flex items-center gap-[4px] text-[12px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 22V10M2 13v7a2 2 0 002 2h13.4a2 2 0 002-1.7l1.4-8A2 2 0 0018.8 8H14V4a2 2 0 00-2-2L9 8v14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          48
        </div>
        <div className="flex items-center gap-[4px] text-[12px] rotate-180">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 22V10M2 13v7a2 2 0 002 2h13.4a2 2 0 002-1.7l1.4-8A2 2 0 0018.8 8H14V4a2 2 0 00-2-2L9 8v14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex-1" />
        <div className="text-[12px] flex items-center gap-[4px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="6" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="18" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="18" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 11l8-4M8 13l8 4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Share
        </div>
      </div>

      <div
        className="bg-[hsl(0,14%,22%)] rounded-[8px] p-[12px] text-[12px] font-[400] whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: renderContent?.[0]?.text }}
      />
    </div>
  );
};
