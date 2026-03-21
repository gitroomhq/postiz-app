import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { textSlicer } from '@gitroom/helpers/utils/count.length';
import { FC } from 'react';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';

const Icons = () => {
  return (
    <svg
      width="31"
      height="16"
      viewBox="0 0 31 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 0C5.87827 0 3.84344 0.842855 2.34315 2.34315C0.842855 3.84344 0 5.87827 0 8C0 10.1217 0.842855 12.1566 2.34315 13.6569C3.84344 15.1571 5.87827 16 8 16C10.1217 16 12.1566 15.1571 13.6569 13.6569C15.1571 12.1566 16 10.1217 16 8C16 5.87827 15.1571 3.84344 13.6569 2.34315C12.1566 0.842855 10.1217 0 8 0Z"
        fill="url(#paint0_linear_2511_139661)"
      />
      <path
        d="M12.162 7.338C12.338 7.461 12.5 7.583 12.5 8.012C12.5 8.442 12.271 8.616 12.026 8.737C12.1262 8.90028 12.1581 9.09637 12.115 9.283C12.038 9.627 11.723 9.894 11.443 9.973C11.564 10.167 11.602 10.358 11.458 10.593C11.273 10.888 11.112 11 10.4 11H7.5C6.512 11 6 10.454 6 10V7.665C6 6.435 7.467 5.39 7.467 4.535L7.361 3.47C7.356 3.405 7.369 3.246 7.419 3.2C7.499 3.121 7.72 3 8.054 3C8.272 3 8.417 3.041 8.588 3.123C9.169 3.4 9.32 4.101 9.32 4.665C9.32 4.936 8.906 5.748 8.85 6.029C8.85 6.029 9.717 5.837 10.729 5.83C11.79 5.824 12.478 6.02 12.478 6.672C12.478 6.933 12.259 7.195 12.162 7.338ZM3.6 7H4.4C4.55913 7 4.71174 7.06321 4.82426 7.17574C4.93679 7.28826 5 7.44087 5 7.6V11.4C5 11.5591 4.93679 11.7117 4.82426 11.8243C4.71174 11.9368 4.55913 12 4.4 12H3.6C3.44087 12 3.28826 11.9368 3.17574 11.8243C3.06321 11.7117 3 11.5591 3 11.4V7.6C3 7.44087 3.06321 7.28826 3.17574 7.17574C3.28826 7.06321 3.44087 7 3.6 7Z"
        fill="white"
      />
      <path
        d="M23 0C20.8783 0 18.8434 0.842855 17.3431 2.34315C15.8429 3.84344 15 5.87827 15 8C15 10.1217 15.8429 12.1566 17.3431 13.6569C18.8434 15.1571 20.8783 16 23 16C25.1217 16 27.1566 15.1571 28.6569 13.6569C30.1571 12.1566 31 10.1217 31 8C31 5.87827 30.1571 3.84344 28.6569 2.34315C27.1566 0.842855 25.1217 0 23 0Z"
        fill="url(#paint1_linear_2511_139661)"
      />
      <path
        d="M25.473 4C23.275 4 23 5.824 23 5.824C23 5.824 22.726 4 20.528 4C18.414 4 17.798 6.222 18.056 7.41C18.736 10.55 23 12.75 23 12.75C23 12.75 27.265 10.55 27.945 7.41C28.202 6.222 27.585 4 25.473 4Z"
        fill="white"
      />
      <defs>
        <linearGradient
          id="paint0_linear_2511_139661"
          x1="8"
          y1="0"
          x2="8"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#18AFFF" />
          <stop offset="1" stopColor="#0062DF" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_2511_139661"
          x1="23"
          y1="0"
          x2="23"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF6680" />
          <stop offset="1" stopColor="#E61739" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const FacebookPreview: FC<{
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
    <div className="py-[15px] flex flex-col px-[15px] w-full gap-[20px] bg-bgFacebook rounded-[12px]">
      <div className="flex gap-[8px]">
        <div className="w-[36px] h-[36px]">
          <img
            src={integration?.picture || '/no-picture.jpg'}
            alt="social"
            className="rounded-full relative z-[2] w-[36px] h-[36px]"
          />
        </div>
        <div className="flex flex-col leading-[18px]">
          <div className="text-[14px] font-[500]">{integration?.name}</div>
          <div className="text-[12px] font-[400] text-[#A3A3A3] flex gap-[4px] items-center">
            <span>30m •</span>
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
              >
                <path
                  d="M5 10C4.30833 10 3.65833 9.86867 3.05 9.606C2.44167 9.34367 1.9125 8.9875 1.4625 8.5375C1.0125 8.0875 0.656333 7.55833 0.394 6.95C0.131333 6.34167 0 5.69167 0 5C0 4.30833 0.131333 3.65833 0.394 3.05C0.656333 2.44167 1.0125 1.9125 1.4625 1.4625C1.9125 1.0125 2.44167 0.656167 3.05 0.3935C3.65833 0.131167 4.30833 0 5 0C5.69167 0 6.34167 0.131167 6.95 0.3935C7.55833 0.656167 8.0875 1.0125 8.5375 1.4625C8.9875 1.9125 9.34367 2.44167 9.606 3.05C9.86867 3.65833 10 4.30833 10 5C10 5.69167 9.86867 6.34167 9.606 6.95C9.34367 7.55833 8.9875 8.0875 8.5375 8.5375C8.0875 8.9875 7.55833 9.34367 6.95 9.606C6.34167 9.86867 5.69167 10 5 10ZM4.5 8.975V8C4.225 8 3.98967 7.90217 3.794 7.7065C3.598 7.5105 3.5 7.275 3.5 7V6.5L1.1 4.1C1.075 4.25 1.052 4.4 1.031 4.55C1.01033 4.7 1 4.85 1 5C1 6.00833 1.33133 6.89167 1.994 7.65C2.65633 8.40833 3.49167 8.85 4.5 8.975ZM7.95 7.7C8.11667 7.51667 8.26667 7.31867 8.4 7.106C8.53333 6.89367 8.64383 6.67283 8.7315 6.4435C8.81883 6.2145 8.8855 5.97917 8.9315 5.7375C8.97717 5.49583 9 5.25 9 5C9 4.18333 8.773 3.4375 8.319 2.7625C7.86467 2.0875 7.25833 1.6 6.5 1.3V1.5C6.5 1.775 6.40217 2.01033 6.2065 2.206C6.0105 2.402 5.775 2.5 5.5 2.5H4.5V3.5C4.5 3.64167 4.45217 3.76033 4.3565 3.856C4.2605 3.952 4.14167 4 4 4H3V5H6C6.14167 5 6.2605 5.04783 6.3565 5.1435C6.45217 5.2395 6.5 5.35833 6.5 5.5V7H7C7.21667 7 7.4125 7.0645 7.5875 7.1935C7.7625 7.32283 7.88333 7.49167 7.95 7.7Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
      <div
        className="text-[14px] font-[400] whitespace-pre-line"
        dangerouslySetInnerHTML={{
          __html: renderContent?.[0]?.text,
        }}
      />
      {!!renderContent?.[0]?.images?.length && (
        <div className="h-[280px] -mx-[15px] overflow-hidden flex">
          {renderContent?.[0]?.images.map((image, index) => (
            <a
              key={`image_${index}`}
              className="flex-1"
              href={mediaDir.set(image.path)}
              target="_blank"
            >
              <VideoOrImage autoplay={true} src={mediaDir.set(image.path)} />
            </a>
          ))}
        </div>
      )}
      <div className="flex text-textLinkedin text-[12px] font-[400] items-center">
        <div className="flex flex-1 gap-[10px] items-center">
          <Icons />
          <div className="">You & 12 other</div>
        </div>
        <div className="gap-[9px] items-center flex">
          <div>20 Comments</div>
        </div>
      </div>
      <div className="pt-[8px] flex text-[14px] font-[700] px-[32px] justify-between border-t border-borderLinkedin text-textLinkedin">
        <div className="flex gap-[4px] items-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20.2983 12.23C20.5762 12.435 20.832 12.6383 20.832 13.3533C20.832 14.07 20.4705 14.36 20.0836 14.5617C20.2417 14.8338 20.2922 15.1606 20.2241 15.4717C20.1026 16.045 19.6052 16.49 19.1631 16.6217C19.3541 16.945 19.4141 17.2633 19.1868 17.655C18.8947 18.1467 18.6405 18.3333 17.5162 18.3333H12.9373C11.3773 18.3333 10.5689 17.4233 10.5689 16.6667V12.775C10.5689 10.725 12.8852 8.98333 12.8852 7.55833L12.7178 5.78333C12.7099 5.675 12.7305 5.41 12.8094 5.33333C12.9357 5.20167 13.2847 5 13.812 5C14.1562 5 14.3852 5.06833 14.6552 5.205C15.5726 5.66667 15.811 6.835 15.811 7.775C15.811 8.22667 15.1573 9.58 15.0689 10.0483C15.0689 10.0483 16.4378 9.72833 18.0357 9.71667C19.711 9.70667 20.7973 10.0333 20.7973 11.12C20.7973 11.555 20.4515 11.9917 20.2983 12.23ZM6.7794 11.6667H8.04256C8.29382 11.6667 8.53478 11.772 8.71245 11.9596C8.89011 12.1471 8.98993 12.4015 8.98993 12.6667V19C8.98993 19.2652 8.89011 19.5196 8.71245 19.7071C8.53478 19.8946 8.29382 20 8.04256 20H6.7794C6.52814 20 6.28718 19.8946 6.10951 19.7071C5.93184 19.5196 5.83203 19.2652 5.83203 19V12.6667C5.83203 12.4015 5.93184 12.1471 6.10951 11.9596C6.28718 11.772 6.52814 11.6667 6.7794 11.6667Z"
              fill="currentColor"
            />
          </svg>
          <div>Like</div>
        </div>
        <div className="flex gap-[4px] items-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <mask
              id="mask0_2511_139673"
              style={{ maskType: 'alpha' }}
              maskUnits="userSpaceOnUse"
              x="-1"
              y="2"
              width="21"
              height="21"
            >
              <rect
                x="-0.195312"
                y="2.88281"
                width="19.6964"
                height="19.6964"
                fill="currentColor"
              />
            </mask>
            <g mask="url(#mask0_2511_139673)">
              <path
                d="M1.44531 20.9371V6.1648C1.44531 5.71343 1.60617 5.32689 1.92787 5.00518C2.24903 4.68402 2.6353 4.52344 3.08668 4.52344H16.2176C16.669 4.52344 17.0555 4.68402 17.3772 5.00518C17.6984 5.32689 17.859 5.71343 17.859 6.1648V16.013C17.859 16.4644 17.6984 16.8509 17.3772 17.1726C17.0555 17.4938 16.669 17.6544 16.2176 17.6544H4.72805L1.44531 20.9371ZM3.08668 16.9773L4.05098 16.013H16.2176V6.1648H3.08668V16.9773Z"
                fill="currentColor"
              />
            </g>
          </svg>
          <div>Comments</div>
        </div>
        <div className="flex gap-[4px] items-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.21168 20.2107C4.14582 20.2111 4.08035 20.2005 4.01793 20.1795C3.88741 20.1371 3.77445 20.0529 3.69651 19.94C3.61857 19.827 3.57998 19.6915 3.58668 19.5545C3.58668 19.4607 4.23043 10.3857 13.3304 9.6732V6.4107C13.3303 6.28645 13.3673 6.16498 13.4365 6.06181C13.5058 5.95864 13.6042 5.87846 13.7192 5.8315C13.8343 5.78455 13.9607 5.77295 14.0824 5.79819C14.2041 5.82343 14.3154 5.88436 14.4023 5.9732L20.5711 12.2732C20.6856 12.39 20.7497 12.5471 20.7497 12.7107C20.7497 12.8743 20.6856 13.0314 20.5711 13.1482L14.4023 19.4482C14.3154 19.537 14.2041 19.598 14.0824 19.6232C13.9607 19.6485 13.8343 19.6369 13.7192 19.5899C13.6042 19.5429 13.5058 19.4628 13.4365 19.3596C13.3673 19.2564 13.3303 19.135 13.3304 19.0107V15.8107C7.25543 16.042 4.76481 19.8732 4.73981 19.9201C4.68342 20.0091 4.60544 20.0825 4.5131 20.1333C4.42076 20.1841 4.31708 20.2107 4.21168 20.2107ZM14.5804 7.94195V10.2576C14.5805 10.4196 14.5177 10.5754 14.4052 10.692C14.2927 10.8086 14.1392 10.8769 13.9773 10.8826C8.08981 11.0982 5.98356 15.0201 5.22731 17.542C6.78981 16.192 9.57418 14.542 13.9179 14.542H13.9461C14.1118 14.542 14.2708 14.6078 14.388 14.725C14.5052 14.8422 14.5711 15.0012 14.5711 15.167V17.4826L19.2586 12.7138L14.5804 7.94195Z"
              fill="currentColor"
            />
          </svg>
          <div>Share</div>
        </div>
      </div>
      {renderContent.length > 1 && (
        <>
          <div className="flex items-center">
            <div className="text-[14px] font-[700]">Most relevant</div>
            <div>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.5437 8L7.4563 8C7.05059 8 6.84741 8.56798 7.13429 8.90016L9.67799 11.8456C9.85583 12.0515 10.1442 12.0515 10.322 11.8456L12.8657 8.90016C13.1526 8.56798 12.9494 8 12.5437 8Z"
                  fill="#A3A3A3"
                />
              </svg>
            </div>
          </div>
          {renderContent.slice(1).map((value, index) => (
            <div key={index} className="flex flex-col gap-[12px]">
              <div className="flex gap-[6px] leading-[17px]">
                <div className="h-[34px]">
                  <img
                    src={integration?.picture || '/no-picture.jpg'}
                    alt="social"
                    className="rounded-full relative z-[2] h-[34px] w-[34px]"
                  />
                </div>
                <div className="flex flex-col gap-[6px] min-w-[150px]">
                  <div className="flex flex-col gap-[4px] bg-bgCommentFacebook py-[8px] px-[12px] rounded-[12px]">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-[6px]">
                        <div className="text-[13px] font-[500]">
                          {integration?.name}
                        </div>
                      </div>
                    </div>
                    <div
                      className="whitespace-pre-line text-[14px] font-[400]"
                      dangerouslySetInnerHTML={{
                        __html: value.text,
                      }}
                    />
                    {!!value.images?.length && (
                      <div className="h-[100px] mt-[12px] -mx-[15px] overflow-hidden flex">
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
                  <div className="flex font-[400] text-[12px] text-textLinkedin items-center">
                    <div className="flex gap-[16px] flex-1">
                      <div className="font-[700]">9h</div>
                      <div className="font-[700]">Like</div>
                      <div className="font-[700]">Reply</div>
                    </div>
                    <div className="flex gap-[4px]">
                      <div>2</div>
                      <div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M8 0C5.87827 0 3.84344 0.842855 2.34315 2.34315C0.842855 3.84344 0 5.87827 0 8C0 10.1217 0.842855 12.1566 2.34315 13.6569C3.84344 15.1571 5.87827 16 8 16C10.1217 16 12.1566 15.1571 13.6569 13.6569C15.1571 12.1566 16 10.1217 16 8C16 5.87827 15.1571 3.84344 13.6569 2.34315C12.1566 0.842855 10.1217 0 8 0Z"
                            fill="url(#paint0_linear_2511_139920)"
                          />
                          <path
                            d="M10.473 4C8.275 4 8 5.824 8 5.824C8 5.824 7.726 4 5.528 4C3.414 4 2.798 6.222 3.056 7.41C3.736 10.55 8 12.75 8 12.75C8 12.75 12.265 10.55 12.945 7.41C13.202 6.222 12.585 4 10.473 4Z"
                            fill="white"
                          />
                          <defs>
                            <linearGradient
                              id="paint0_linear_2511_139920"
                              x1="8"
                              y1="0"
                              x2="8"
                              y2="16"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#FF6680" />
                              <stop offset="1" stopColor="#E61739" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
