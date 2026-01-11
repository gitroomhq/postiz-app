import { FC } from 'react';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { textSlicer } from '@gitroom/helpers/utils/count.length';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';

export const YoutubePreview: FC<{
  maximumCharacters?: number;
}> = (props) => {
  const { value: topValue, integration } = useIntegration();
  const current = useLaunchStore((state) => state.current);
  const mediaDir = useMediaDirectory();

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
        .replace(/\[\[\[([.\s\S]*?)]]]/, (match, match1) => {
          return `<span class="font-bold font-[arial]" style="color: #ae8afc">${match1}</span>`;
        }) +
      `<mark class="bg-red-500" data-tooltip-id="tooltip" data-tooltip-content="This text will be cropped">` +
      newContent.slice(end).replace(/\[\[\[([.\s\S]*?)]]]/, (match, match1) => {
        return `<span class="font-bold font-[arial]" style="color: #ae8afc">${match1}</span>`;
      }) +
      `</mark>`;

    return { text: finalValue, images: p.image };
  });

  return (
    <div className="absolute left-0 top-0 gap-[12px] w-full h-full flex flex-col p-[16px] bg-bgYoutube">
      <div
        style={{ background: 'url(/no-video-youtube.png)' }}
        className="!bg-cover w-full aspect-[calc(16/9)] rounded-[4px] overflow-hidden"
      >
        {!!renderContent?.[0]?.images?.[0]?.path && (
          <VideoOrImage
            imageClassName="w-full aspect-[calc(16/9)]"
            videoClassName="w-full aspect-[calc(16/9)] bg-black"
            autoplay={true}
            src={mediaDir.set(renderContent?.[0]?.images?.[0]?.path || '')}
          />
        )}
      </div>
      <div className="flex items-center">
        <div className="flex flex-1 gap-[17px] items-center">
          <div>
            <img
              src={integration?.picture || '/no-picture.jpg'}
              alt="social"
              className="rounded-full z-[2] w-[40px] h-[40px]"
            />
          </div>
          <div className="flex flex-col">
            <div className="text-[14px] font-[500]">{integration?.name}</div>
            <div className="text-[10px] font-[400]">16.7M subscribers</div>
          </div>
          <div>
            <div className="h-[32px] text-[12px] text-newBgColor font-[500] px-[14px] flex justify-center items-center bg-youtubeButton rounded-[16px]">
              Subscribe
            </div>
          </div>
        </div>
        <div className="gap-[4px] flex items-center text-youtubeSvg">
          <div className="bg-youtubeBgAction text-[13px] px-[9px] h-[32px] rounded-[16px] flex items-center">
            <svg
              className="mr-[9px]"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="15"
              viewBox="0 0 16 15"
              fill="none"
            >
              <path
                d="M13.7503 6.1035H10.0621L11.3874 1.79617C11.6664 0.898087 10.934 0 9.92255 0C9.41684 0 8.92855 0.209263 8.59722 0.566754L3.48772 6.1035H0V14.8228H3.48772H4.35965H12.5819C13.5062 14.8228 14.3084 14.2386 14.4915 13.419L15.6598 8.18742C15.8953 7.10622 14.9797 6.1035 13.7503 6.1035ZM3.48772 13.9509H0.871929V6.97543H3.48772V13.9509ZM14.8054 7.99559L13.637 13.2272C13.5498 13.6457 13.1051 13.9509 12.5819 13.9509H4.35965V6.44356L9.24245 1.15967C9.40812 0.976561 9.66098 0.871929 9.92255 0.871929C10.1493 0.871929 10.3585 0.967842 10.4719 1.13351C10.5329 1.2207 10.6027 1.36021 10.5503 1.54331L9.22501 5.85065L8.87624 6.97543H10.0533H13.7416C14.0991 6.97543 14.4391 7.12366 14.6397 7.37652C14.753 7.50731 14.8664 7.72529 14.8054 7.99559Z"
                fill="currentColor"
              />
            </svg>
            <div className="mr-[14px]">205K</div>
            <div className="h-[20px] w-[1px] bg-[#A0A0A0] mr-[12px]" />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="15"
              viewBox="0 0 16 15"
              fill="none"
            >
              <path
                d="M12.2092 0H11.3373H3.11498C2.18201 0 1.38856 0.584193 1.20545 1.40381L0.0370652 6.63538C-0.198356 7.71657 0.71717 8.71929 1.94659 8.71929H5.63485L4.30952 13.0266C4.0305 13.9247 4.76292 14.8228 5.77436 14.8228C6.28008 14.8228 6.76836 14.6135 7.09969 14.256L12.2092 8.71929H15.6969V0H12.2092ZM6.45446 13.6631C6.2888 13.8462 6.03594 13.9509 5.77436 13.9509C5.54766 13.9509 5.33839 13.855 5.22504 13.6893C5.16401 13.6021 5.09425 13.4626 5.14657 13.2795L6.4719 8.97215L6.82067 7.84736H5.63485H1.94659C1.5891 7.84736 1.24905 7.69913 1.0485 7.44628C0.943871 7.31549 0.830521 7.0975 0.891556 6.81849L2.05994 1.58691C2.14713 1.1771 2.59182 0.871929 3.11498 0.871929H11.3373V8.37924L6.45446 13.6631ZM14.825 7.84736H12.2092V0.871929H14.825V7.84736Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="h-[32px] w-[32px] rounded-full bg-youtubeBgAction flex justify-center items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="16"
              viewBox="0 0 18 16"
              fill="none"
            >
              <path
                d="M11.3351 2.29317L16.2702 7.84736L11.3351 13.4016V10.4632V9.59122H10.4632C7.01031 9.59122 4.23758 10.4632 1.96184 12.2855C3.56619 8.73673 6.4174 6.70514 10.5852 6.09479L11.3351 5.98143V5.23158V2.29317ZM10.4632 0V5.23158C3.67954 6.21686 0.967841 10.7509 0 15.6947C2.42396 12.2332 5.61522 10.4632 10.4632 10.4632V15.6947L17.4386 7.84736L10.4632 0Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="h-[32px] w-[32px] rounded-full bg-youtubeBgAction flex justify-center items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="3"
              viewBox="0 0 14 3"
              fill="none"
            >
              <path
                d="M2.61579 1.30789C2.61579 2.03159 2.03159 2.61579 1.30789 2.61579C0.584193 2.61579 0 2.03159 0 1.30789C0 0.584193 0.584193 0 1.30789 0C2.03159 0 2.61579 0.584193 2.61579 1.30789ZM6.53947 0C5.81577 0 5.23158 0.584193 5.23158 1.30789C5.23158 2.03159 5.81577 2.61579 6.53947 2.61579C7.26317 2.61579 7.84736 2.03159 7.84736 1.30789C7.84736 0.584193 7.26317 0 6.53947 0ZM11.771 0C11.0473 0 10.4632 0.584193 10.4632 1.30789C10.4632 2.03159 11.0473 2.61579 11.771 2.61579C12.4947 2.61579 13.0789 2.03159 13.0789 1.30789C13.0789 0.584193 12.4947 0 11.771 0Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      </div>
      <div
        className="bg-youtubeBgAction rounded-[12px] p-[12px] text-[12px] font-[400] whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: renderContent?.[0]?.text }}
      />
    </div>
  );
};
