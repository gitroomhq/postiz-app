import { FC } from 'react';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { textSlicer } from '@gitroom/helpers/utils/count.length';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';

export const PinterestPreview: FC<{
  maximumCharacters?: number;
}> = (props) => {
  const { value: topValue, integration } = useIntegration();
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
    <div className="absolute left-0 top-0 gap-[10px] w-full h-full flex flex-col p-[16px] bg-bgYoutube">
      <div className="h-[40px] items-center flex">
        <div className="flex gap-[16px] flex-1 items-center">
          <div className="flex gap-[8px] items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="20"
              viewBox="0 0 22 20"
              fill="none"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10.7432 2.88777C8.7438 0.550353 5.40975 -0.0784043 2.90469 2.06197C0.399644 4.20234 0.0469677 7.78093 2.0142 10.3124C3.64982 12.4171 8.59977 16.8561 10.2221 18.2928C10.4036 18.4535 10.4944 18.5339 10.6002 18.5655C10.6926 18.593 10.7937 18.593 10.8861 18.5655C10.9919 18.5339 11.0827 18.4535 11.2642 18.2928C12.8865 16.8561 17.8365 12.4171 19.4721 10.3124C21.4393 7.78093 21.1297 4.17982 18.5816 2.06197C16.0335 -0.0558897 12.7425 0.550353 10.7432 2.88777Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>80</div>
          </div>
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="19"
              viewBox="0 0 21 19"
              fill="none"
            >
              <path
                d="M19.358 9.25C19.358 13.9444 15.5524 17.75 10.858 17.75C9.78124 17.75 8.75123 17.5498 7.80318 17.1845C7.62984 17.1178 7.54318 17.0844 7.47426 17.0685C7.40647 17.0529 7.3574 17.0463 7.28788 17.0437C7.21721 17.041 7.13967 17.049 6.98459 17.065L1.86356 17.5944C1.37532 17.6448 1.1312 17.6701 0.987197 17.5822C0.861771 17.5057 0.776342 17.3779 0.753601 17.2328C0.727493 17.0661 0.844148 16.8502 1.07746 16.4184L2.71312 13.3908C2.84782 13.1415 2.91517 13.0168 2.94568 12.8969C2.9758 12.7786 2.98309 12.6932 2.97345 12.5714C2.96369 12.4481 2.90959 12.2876 2.80139 11.9666C2.51387 11.1136 2.35802 10.2 2.35802 9.25C2.35802 4.55558 6.1636 0.75 10.858 0.75C15.5524 0.75 19.358 4.55558 19.358 9.25Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M18.75 9.75V13.95C18.75 15.6302 18.75 16.4702 18.423 17.112C18.1354 17.6765 17.6765 18.1354 17.112 18.423C16.4702 18.75 15.6302 18.75 13.95 18.75H5.55C3.86984 18.75 3.02976 18.75 2.38803 18.423C1.82354 18.1354 1.3646 17.6765 1.07698 17.112C0.75 16.4702 0.75 15.6302 0.75 13.95V9.75M13.75 4.75L9.75 0.75M9.75 0.75L5.75 4.75M9.75 0.75V12.75"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="4"
              viewBox="0 0 18 4"
              fill="none"
            >
              <path
                d="M8.75 2.75C9.30228 2.75 9.75 2.30228 9.75 1.75C9.75 1.19772 9.30228 0.75 8.75 0.75C8.19772 0.75 7.75 1.19772 7.75 1.75C7.75 2.30228 8.19772 2.75 8.75 2.75Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15.75 2.75C16.3023 2.75 16.75 2.30228 16.75 1.75C16.75 1.19772 16.3023 0.75 15.75 0.75C15.1977 0.75 14.75 1.19772 14.75 1.75C14.75 2.30228 15.1977 2.75 15.75 2.75Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M1.75 2.75C2.30228 2.75 2.75 2.30228 2.75 1.75C2.75 1.19772 2.30228 0.75 1.75 0.75C1.19772 0.75 0.75 1.19772 0.75 1.75C0.75 2.30228 1.19772 2.75 1.75 2.75Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <div className="h-full flex rounded-[12px] text-[16px] font-[600] w-[100px] bg-[#E70024] text-white justify-center items-center">
          Save
        </div>
      </div>
      <div
        style={{ background: 'url(/no-video-youtube.png)' }}
        className="!bg-cover w-full aspect-[calc(16/9)] rounded-[20px] overflow-hidden"
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
      <div
        className="mt-[13px] whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: renderContent?.[0]?.text || '' }}
      ></div>
    </div>
  );
};
