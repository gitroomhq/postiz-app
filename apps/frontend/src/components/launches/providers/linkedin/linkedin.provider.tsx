import { FC } from 'react';
import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useFormatting } from '@gitroom/frontend/components/launches/helpers/use.formatting';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import {
  afterLinkedinCompanyPreventRemove,
  linkedinCompanyPreventRemove,
} from '@gitroom/helpers/utils/linkedin.company.prevent.remove';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';
import Image from 'next/image';

const LinkedinPreview: FC = (props) => {
  const { value: topValue, integration } = useIntegration();
  const mediaDir = useMediaDirectory();
  const newValues = useFormatting(topValue, {
    removeMarkdown: true,
    saveBreaklines: true,
    beforeSpecialFunc: (text: string) => {
      return linkedinCompanyPreventRemove(text);
    },
    specialFunc: (text: string) => {
      return afterLinkedinCompanyPreventRemove(text.slice(0, 280));
    },
  });

  const [firstPost, ...morePosts] = newValues;
  if (!firstPost) {
    return null;
  }

  return (
    <div className="rounded-[8px] flex flex-col gap-[8px] border border-black/90 w-[555px] pt-[12px] pl-[16px] pb-[12px] pr-[40px] bg-white text-black font-['helvetica']">
      <div className="flex gap-[8px]">
        <div className="w-[48px] h-[48px] relative">
          <Image
            width={48}
            height={48}
            src={integration?.picture!}
            alt="x"
            className="rounded-full w-full h-full relative z-[2]"
          />
          <Image
            width={24}
            height={24}
            src={`/icons/platforms/${integration?.identifier!}.png`}
            alt="x"
            className="rounded-full absolute -right-[5px] -bottom-[5px] z-[2]"
          />
        </div>
        <div className="flex flex-col leading-[16px]">
          <div className="text-[14px] font-[600]">{integration?.name}</div>
          <div className="text-[12px] font-[400] text-black/60">
            CEO @ Gitroom
          </div>
          <div className="text-[12px] font-[400] text-black/60">1m</div>
        </div>
      </div>
      <div>
        <pre
          className="font-['helvetica'] text-[14px] font-[400] text-wrap"
          dangerouslySetInnerHTML={{ __html: firstPost?.text }}
        />

        {!!firstPost?.images?.length && (
          <div className="-ml-[16px] -mr-[40px] flex-1 h-[555px] flex overflow-hidden mt-[12px] gap-[2px]">
            {firstPost.images.map((image, index) => (
              <a
                key={`image_${index}`}
                href={mediaDir.set(image.path)}
                className="flex-1"
                target="_blank"
              >
                <VideoOrImage src={mediaDir.set(image.path)} autoplay={true} />
              </a>
            ))}
          </div>
        )}
      </div>
      {morePosts.map((p, index) => (
        <div className="flex gap-[8px]" key={index}>
          <div className="w-[40px] h-[40px] relative">
            <Image
              width={48}
              height={48}
              src={integration?.picture!}
              alt="x"
              className="rounded-full w-full h-full relative z-[2]"
            />
            <Image
              width={24}
              height={24}
              src={`/icons/platforms/${integration?.identifier!}.png`}
              alt="x"
              className="rounded-full absolute -right-[5px] -bottom-[5px] z-[2]"
            />
          </div>
          <div className="flex-1 flex flex-col leading-[16px] bg-customColor33 w-full pt-[8px] pr-[64px] pl-[12px] pb-[8px] rounded-[8px]">
            <div className="text-[14px] font-[600]">{integration?.name}</div>
            <div className="text-[12px] font-[400] text-black/60">
              CEO @ Gitroom
            </div>
            <div className="text-[14px] mt-[8px] font-[400] text-black/90">
              {p.text}
            </div>

            {!!p?.images?.length && (
              <div className="w-full h-[120px] flex overflow-hidden mt-[12px] gap-[2px]">
                {p.images.map((image, index) => (
                  <a
                    key={`image_${index}`}
                    href={mediaDir.set(image.path)}
                    target="_blank"
                  >
                    <div className="w-[120px] h-full">
                      <VideoOrImage
                        autoplay={true}
                        src={mediaDir.set(image.path)}
                      />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default withProvider(null, LinkedinPreview, undefined, undefined, 1300);
