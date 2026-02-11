import { Button } from '@gitroom/react/form/button';
import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import Loading from 'react-loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
const list = [
  'Realistic',
  'Cartoon',
  'Anime',
  'Fantasy',
  'Abstract',
  'Pixel Art',
  'Sketch',
  'Watercolor',
  'Minimalist',
  'Cyberpunk',
  'Monochromatic',
  'Surreal',
  'Pop Art',
  'Fantasy Realism',
];
export const AiImage: FC<{
  value: string;
  onChange: (params: { id: string; path: string }) => void;
}> = (props) => {
  const t = useT();
  const { value, onChange } = props;
  const [loading, setLoading] = useState(false);
  const setLocked = useLaunchStore((p) => p.setLocked);
  const fetch = useFetch();
  const generateImage = useCallback(
    (type: string) => async () => {
      setLoading(true);
      setLocked(true);
      const image = await (
        await fetch('/media/generate-image-with-prompt', {
          method: 'POST',
          body: JSON.stringify({
            prompt: `
<!-- description -->
${value}
<!-- /description -->

<!-- style -->
${type}
<!-- /style -->
  
`,
          }),
        })
      ).json();
      setLoading(false);
      setLocked(false);
      onChange(image);
    },
    [value, onChange]
  );
  return (
    <div className="relative group">
      <div
        {...(value.length < 30
          ? {
              'data-tooltip-id': 'tooltip',
              'data-tooltip-content':
                'Please add at least 30 characters to generate AI image',
            }
          : {})}
        className={clsx(
          'cursor-pointer h-[30px] rounded-[6px] justify-center items-center flex bg-newColColor px-[8px]',
          value.length < 30 && 'opacity-50'
        )}
      >
        {loading && (
          <div className="absolute start-[50%] -translate-x-[50%]">
            <Loading height={15} width={15} type="spin" color="#fff" />
          </div>
        )}
        <div
          className={clsx(
            'flex gap-[5px] items-center',
            loading && 'invisible'
          )}
        >
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <g clip-path="url(#clip0_2352_53053)">
                <path
                  d="M8.33333 2.00033H5.2C4.07989 2.00033 3.51984 2.00033 3.09202 2.21831C2.71569 2.41006 2.40973 2.71602 2.21799 3.09234C2 3.52017 2 4.08022 2 5.20032V10.8003C2 11.9204 2 12.4805 2.21799 12.9083C2.40973 13.2846 2.71569 13.5906 3.09202 13.7823C3.51984 14.0003 4.07989 14.0003 5.2 14.0003H11.3333C11.9533 14.0003 12.2633 14.0003 12.5176 13.9322C13.2078 13.7472 13.7469 13.2081 13.9319 12.518C14 12.2636 14 11.9536 14 11.3337M7 5.66699C7 6.40337 6.40305 7.00033 5.66667 7.00033C4.93029 7.00033 4.33333 6.40337 4.33333 5.66699C4.33333 4.93061 4.93029 4.33366 5.66667 4.33366C6.40305 4.33366 7 4.93061 7 5.66699ZM9.99336 7.94576L4.3541 13.0724C4.03691 13.3607 3.87831 13.5049 3.86429 13.6298C3.85213 13.738 3.89364 13.8454 3.97546 13.9173C4.06985 14.0003 4.28419 14.0003 4.71286 14.0003H10.9707C11.9301 14.0003 12.4098 14.0003 12.7866 13.8391C13.2596 13.6368 13.6365 13.2599 13.8388 12.7869C14 12.4101 14 11.9304 14 10.971C14 10.6482 14 10.4867 13.9647 10.3364C13.9204 10.1475 13.8353 9.97056 13.7155 9.81792C13.6202 9.69646 13.4941 9.59562 13.242 9.39396L11.3772 7.9021C11.1249 7.70026 10.9988 7.59935 10.8599 7.56373C10.7374 7.53234 10.6086 7.53641 10.4884 7.57545C10.352 7.61975 10.2324 7.72842 9.99336 7.94576ZM13 1.01074L12.5932 1.82425C12.4556 2.09958 12.3868 2.23724 12.2948 2.35653C12.2132 2.46238 12.1183 2.55728 12.0125 2.63887C11.8932 2.73083 11.7555 2.79966 11.4802 2.93732L10.6667 3.34408L11.4802 3.75083C11.7555 3.88849 11.8932 3.95732 12.0125 4.04928C12.1183 4.13087 12.2132 4.22577 12.2948 4.33162C12.3868 4.45091 12.4556 4.58857 12.5932 4.8639L13 5.67741L13.4068 4.8639C13.5444 4.58857 13.6132 4.45091 13.7052 4.33162C13.7868 4.22577 13.8817 4.13087 13.9875 4.04928C14.1068 3.95732 14.2445 3.88849 14.5198 3.75083L15.3333 3.34408L14.5198 2.93732C14.2445 2.79966 14.1068 2.73083 13.9875 2.63887C13.8817 2.55728 13.7868 2.46238 13.7052 2.35653C13.6132 2.23724 13.5444 2.09958 13.4068 1.82425L13 1.01074Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
              <defs>
                <clipPath id="clip0_2352_53053">
                  <rect width="16" height="16" fill="currentColor" />
                </clipPath>
              </defs>
            </svg>
          </div>
          <div className="text-[10px] font-[600] iconBreak:hidden block">{t('ai', 'AI')} Image</div>
        </div>
      </div>
      {value.length >= 30 && !loading && (
        <div className="text-[12px] -mt-[10px] w-[200px] absolute bottom-[100%] z-[500] start-0 hidden group-hover:block">
          <ul className="cursor-pointer rounded-[4px] border border-dashed mt-[3px] p-[5px] border-newBgLineColor bg-newColColor">
            {list.map((p) => (
              <li onClick={generateImage(p)} key={p} className="hover:bg-sixth">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
