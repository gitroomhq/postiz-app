import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useFormatting } from '@gitroom/frontend/components/launches/helpers/use.formatting';
import clsx from 'clsx';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';
import { Chakra_Petch } from 'next/font/google';
import { FC } from 'react';

import { ReactComponent as CloudCheckSvg } from '@gitroom/frontend/assets/cloud-check.svg';

const chakra = Chakra_Petch({ weight: '400', subsets: ['latin'] });

export const GeneralPreviewComponent: FC<{ maximumCharacters?: number }> = (
  props
) => {
  const { value: topValue, integration } = useIntegration();
  const mediaDir = useMediaDirectory();
  const newValues = useFormatting(topValue, {
    removeMarkdown: true,
    saveBreaklines: true,
    specialFunc: (text: string) => {
      return (
        text.slice(0, props.maximumCharacters || 10000) +
        '<mark class="bg-red-500" data-tooltip-id="tooltip" data-tooltip-content="This text will be cropped">' +
        text?.slice(props.maximumCharacters || 10000) +
        '</mark>'
      );
    },
  });

  return (
    <div className={clsx('w-[555px] px-[16px]')}>
      <div className="w-full h-full relative flex flex-col">
        {newValues.map((value, index) => (
          <div
            key={`tweet_${index}`}
            style={{}}
            className={clsx(
              `flex gap-[8px] relative`,
              index === newValues.length - 1 ? 'pb-[12px]' : 'pb-[24px]'
            )}
          >
            <div className="w-[40px] flex flex-col items-center">
              <img
                src={integration?.picture}
                alt="x"
                className="rounded-full relative z-[2]"
              />
              {index !== topValue.length - 1 && (
                <div className="flex-1 w-[2px] h-[calc(100%-10px)] bg-customColor25 absolute top-[10px] z-[1]" />
              )}
            </div>
            <div className="flex-1 flex flex-col gap-[4px]">
              <div className="flex">
                <div className="h-[22px] text-[15px] font-[700]">
                  {integration?.name}
                </div>
                <div className="text-[15px] text-customColor26 mt-[1px] ml-[2px]">
                  <CloudCheckSvg
                    aria-label="Verified account"
                    role="img"
                    className="max-w-[20px] max-h-[20px] fill-current h-[1.25em]"
                    data-testid="icon-verified"
                  />
                </div>
                <div className="text-[15px] font-[400] text-customColor27 ml-[4px]">
                  {integration?.display || '@username'}
                </div>
              </div>
              <pre
                className={clsx('text-wrap', chakra.className)}
                dangerouslySetInnerHTML={{ __html: value.text }}
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
                      className="flex-1 h-[270px]"
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
