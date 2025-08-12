import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import clsx from 'clsx';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';
import { FC } from 'react';
import { textSlicer } from '@gitroom/helpers/utils/count.length';
import Image from 'next/image';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';

export const GeneralPreviewComponent: FC<{
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
    <div className={clsx('w-full md:w-[555px] px-[16px]')}>
      <div className="w-full h-full relative flex flex-col">
        {renderContent.map((value, index) => (
          <div
            key={`tweet_${index}`}
            style={{}}
            className={clsx(
              `flex gap-[8px] relative`,
              index === renderContent.length - 1 ? 'pb-[12px]' : 'pb-[24px]'
            )}
          >
            <div className="w-[40px] flex flex-col items-center">
              <div className="relative">
                <img
                  src={
                    current === 'global'
                      ? '/no-picture.jpg'
                      : integration?.picture || '/no-picture.jpg'
                  }
                  alt="x"
                  className="rounded-full relative z-[2]"
                />

                {current !== 'global' && (
                  <Image
                    src={`/icons/platforms/${integration?.identifier}.png`}
                    className="rounded-full absolute z-10 -bottom-[5px] -end-[5px] border border-fifth"
                    alt={integration.identifier}
                    width={20}
                    height={20}
                  />
                )}
              </div>
              {index !== topValue.length - 1 && (
                <div className="flex-1 w-[2px] h-[calc(100%-10px)] bg-customColor25 absolute top-[10px] z-[1]" />
              )}
            </div>
            <div className="flex-1 flex flex-col gap-[4px]">
              <div className="flex">
                <div className="h-[22px] text-[15px] font-[700]">
                  {current === 'global' ? 'Global Edit' : integration?.name}
                </div>
                <div className="text-[15px] text-customColor26 mt-[1px] ms-[2px]">
                  <svg
                    viewBox="0 0 22 22"
                    aria-label="Verified account"
                    role="img"
                    className="max-w-[20px] max-h-[20px] fill-current h-[1.25em]"
                    data-testid="icon-verified"
                  >
                    <g>
                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                    </g>
                  </svg>
                </div>
                <div className="text-[15px] font-[400] text-customColor27 ms-[4px]">
                  {current === 'global'
                    ? ''
                    : integration?.display || '@username'}
                </div>
              </div>
              <div
                className={clsx('text-wrap whitespace-pre', 'preview')}
                dangerouslySetInnerHTML={{
                  __html: value.text,
                }}
              />
              {!!value?.images?.length && (
                <div
                  className={clsx(
                    'w-full rounded-[16px] overflow-hidden mt-[12px]',
                    value?.images?.length > 3
                      ? 'grid grid-cols-2 gap-[4px]'
                      : 'flex gap-[4px]'
                  )}
                >
                  {value.images.map((image, index) => (
                    <a
                      key={`image_${index}`}
                      className="flex-1"
                      href={mediaDir.set(image.path)}
                      target="_blank"
                    >
                      <VideoOrImage
                        autoplay={true}
                        src={mediaDir.set(image.path)}
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
