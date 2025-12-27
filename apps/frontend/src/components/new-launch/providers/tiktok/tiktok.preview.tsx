import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { textSlicer } from '@gitroom/helpers/utils/count.length';
import { FC, ReactNode } from 'react';
import { SliderComponent } from '@gitroom/frontend/components/third-parties/slider.component';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';

const TikTokItem: FC<{ icon: ReactNode; num: string }> = ({ icon, num }) => {
  return (
    <div className="flex items-center flex-col">
      <div className="w-[29px] h-[29px] rounded-full bg-bgTiktokItem flex justify-center items-center text-bgTiktokItemIcon">
        {icon}
      </div>
      <div className="text-[8px] font-[700] text-bgTiktokItemIcon">{num}</div>
    </div>
  );
};
export const TiktokPreview: FC<{
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
        <div className="absolute pointer-events-none w-full h-full start-0 top-0 px-[12px] py-[25px] justify-end items-start text-white flex flex-col">
          <div className="text-[14px] font-[500]">@{integration?.name}</div>
          <div className="text-[13px] font-[400] whitespace-pre-line line-clamp-6 w-full"
            dangerouslySetInnerHTML={{ __html: renderContent?.[0]?.text || '' }}
          />
        </div>
      </div>
      <div className="flex flex-col justify-end gap-[10px] ml-[18px]">
        <div className="relative">
          <img
            src={integration?.picture || '/no-picture.jpg'}
            alt="social"
            className="rounded-full z-[2] w-[29px] h-[29px]"
          />
          <div className="absolute left-[50%] -translate-x-[50%] bottom-0 translate-y-[50%] z-[1]">
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="6.42665" cy="6.42665" r="6.42665" fill="#EA4359" />
              <path
                d="M8.53954 5.78529H7.06717V4.31274C7.06717 3.95875 6.78003 3.67188 6.42627 3.67188C6.07226 3.67188 5.78538 3.95876 5.78538 4.31274V5.78529H4.31277C3.95876 5.78529 3.67188 6.07218 3.67188 6.42615C3.67188 6.78015 3.95878 7.06702 4.31277 7.06702H5.78538V8.53956C5.78538 8.89356 6.07228 9.18043 6.42627 9.18043C6.78027 9.18043 7.06717 8.89354 7.06717 8.53956V7.06702H8.53954C8.89355 7.06702 9.18043 6.78013 9.18043 6.42615C9.18043 6.07216 8.89353 5.78529 8.53954 5.78529Z"
                fill="white"
              />
            </svg>
          </div>
        </div>
        <TikTokItem
          num="1.3M"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="13"
              viewBox="0 0 14 13"
              fill="none"
            >
              <path
                d="M6.73271 12.3432C6.54684 12.3432 6.36164 12.274 6.20938 12.1348C5.66959 11.6478 5.14626 11.1786 4.67368 10.7786C3.32385 9.57933 2.14275 8.55317 1.33269 7.54467C0.421822 6.41466 0 5.33697 0 4.17236C0 3.02468 0.371068 1.98152 1.06313 1.21694C1.75518 0.434621 2.7168 0 3.76278 0C4.53921 0 5.24773 0.260773 5.87189 0.747687C6.19221 1.00846 6.47958 1.30386 6.73268 1.66922C6.98577 1.30386 7.27247 1.00846 7.59346 0.747687C8.21762 0.243805 8.92615 0 9.70257 0C10.7486 0 11.6937 0.434621 12.4022 1.21694C13.0943 1.98159 13.4654 3.04235 13.4654 4.17236C13.4654 5.35467 13.0435 6.41466 12.1327 7.54467C11.3226 8.55313 10.1415 9.57853 8.79167 10.7786C8.33624 11.1786 7.79644 11.6478 7.25597 12.1348C7.10372 12.274 6.91852 12.3432 6.73264 12.3432H6.73271Z"
                fill="currentColor"
              />
            </svg>
          }
        />
        <TikTokItem
          num="10.7M"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="14"
              viewBox="0 0 15 14"
              fill="none"
            >
              <path
                d="M7.03906 0C10.9263 0.000164123 14.0771 2.70127 14.0771 6.0332C14.0771 6.9371 13.8434 7.79378 13.4277 8.56348C13.4272 8.56492 13.4274 8.56696 13.4268 8.56836C12.6717 10.1862 11.4147 11.5178 9.84277 12.3643L8.0918 13.3076C7.64292 13.5491 7.10605 13.1896 7.1582 12.6826L7.22168 12.0615C7.16098 12.0629 7.10014 12.0664 7.03906 12.0664C3.15189 12.0664 0.000323506 9.365 0 6.0332C0 2.70117 3.15169 0 7.03906 0ZM3.41895 5.22852C2.86382 5.22876 2.41406 5.67919 2.41406 6.23438C2.41423 6.78942 2.86392 7.23901 3.41895 7.23926C3.97418 7.23926 4.42464 6.78957 4.4248 6.23438C4.4248 5.67904 3.97428 5.22852 3.41895 5.22852ZM7.03711 5.22852C6.48177 5.22852 6.03125 5.67904 6.03125 6.23438C6.03143 6.78956 6.48188 7.23926 7.03711 7.23926C7.59219 7.23908 8.04181 6.78945 8.04199 6.23438C8.04199 5.67915 7.5923 5.22869 7.03711 5.22852ZM10.6582 5.22852C10.1029 5.22852 9.65234 5.67904 9.65234 6.23438C9.65251 6.78957 10.103 7.23926 10.6582 7.23926C11.2133 7.23914 11.6629 6.7895 11.6631 6.23438C11.6631 5.67911 11.2134 5.22864 10.6582 5.22852Z"
                fill="currentColor"
              />
            </svg>
          }
        />
        <TikTokItem
          num="1.2M"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="11"
              height="12"
              viewBox="0 0 11 12"
              fill="none"
            >
              <path
                d="M8.09766 0C9.37507 0.000192409 10.4129 1.04397 10.4189 2.31543V10.7666C10.4189 11.852 9.6448 12.3079 8.69727 11.7803L5.77051 10.1543C5.46465 9.98038 4.96034 9.98042 4.64844 10.1543L1.72168 11.7803C0.77405 12.3021 8.98228e-05 11.8461 0 10.7666V2.31543C0 1.04385 1.03786 0 2.31543 0H8.09766Z"
                fill="currentColor"
              />
            </svg>
          }
        />
        <TikTokItem
          num="1.2M"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="12"
              viewBox="0 0 15 12"
              fill="none"
            >
              <path
                d="M14.4733 6.3949L9.33173 11.5364C9.12172 11.7465 8.80634 11.8091 8.5316 11.6955C8.25755 11.5819 8.07853 11.314 8.07853 11.0173V8.82547C3.18623 8.99211 1.26785 10.7872 1.24864 10.8064H1.24795C1.0159 11.0323 0.662667 11.0791 0.378972 10.9221C0.0952775 10.7644 -0.0520695 10.4401 0.0167829 10.1234C0.0319314 10.0538 1.57984 3.43187 8.07847 2.96368V0.734176C8.07847 0.437402 8.2575 0.169555 8.53155 0.055929C8.80629 -0.0576845 9.12166 0.00497537 9.33167 0.214988L14.4732 5.35653C14.6109 5.49425 14.6887 5.68084 14.6887 5.87571C14.6887 6.07058 14.6109 6.25718 14.4732 6.39489L14.4733 6.3949Z"
                fill="currentColor"
              />
            </svg>
          }
        />
        <div>
          <img
            src={integration?.picture || '/no-picture.jpg'}
            alt="social"
            className="rounded-full relative z-[2] w-[29px] h-[29px]"
          />
        </div>
      </div>
    </div>
  );
};
