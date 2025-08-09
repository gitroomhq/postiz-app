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
  const setLocked = useLaunchStore(p => p.setLocked);
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
      <Button
        {...(value.length < 30
          ? {
              'data-tooltip-id': 'tooltip',
              'data-tooltip-content':
                'Please add at least 30 characters to generate AI image',
            }
          : {})}
        className={clsx(
          'relative ms-[10px] rounded-[4px] gap-[8px] !text-primary justify-center items-center flex border border-dashed border-newBgLineColor bg-newColColor',
          value.length < 30 && 'opacity-25'
        )}
      >
        {loading && (
          <div className="absolute start-[50%] -translate-x-[50%]">
            <Loading height={30} width={30} type="spin" color="#fff" />
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
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M19.5 3H7.5C7.10218 3 6.72064 3.15804 6.43934 3.43934C6.15804 3.72064 6 4.10218 6 4.5V6H4.5C4.10218 6 3.72064 6.15804 3.43934 6.43934C3.15804 6.72064 3 7.10218 3 7.5V19.5C3 19.8978 3.15804 20.2794 3.43934 20.5607C3.72064 20.842 4.10218 21 4.5 21H16.5C16.8978 21 17.2794 20.842 17.5607 20.5607C17.842 20.2794 18 19.8978 18 19.5V18H19.5C19.8978 18 20.2794 17.842 20.5607 17.5607C20.842 17.2794 21 16.8978 21 16.5V4.5C21 4.10218 20.842 3.72064 20.5607 3.43934C20.2794 3.15804 19.8978 3 19.5 3ZM7.5 4.5H19.5V11.0044L17.9344 9.43875C17.6531 9.15766 17.2717 8.99976 16.8741 8.99976C16.4764 8.99976 16.095 9.15766 15.8137 9.43875L8.75344 16.5H7.5V4.5ZM16.5 19.5H4.5V7.5H6V16.5C6 16.8978 6.15804 17.2794 6.43934 17.5607C6.72064 17.842 7.10218 18 7.5 18H16.5V19.5ZM19.5 16.5H10.875L16.875 10.5L19.5 13.125V16.5ZM11.25 10.5C11.695 10.5 12.13 10.368 12.5 10.1208C12.87 9.87357 13.1584 9.52217 13.3287 9.11104C13.499 8.6999 13.5436 8.2475 13.4568 7.81105C13.37 7.37459 13.1557 6.97368 12.841 6.65901C12.5263 6.34434 12.1254 6.13005 11.689 6.04323C11.2525 5.95642 10.8001 6.00097 10.389 6.17127C9.97783 6.34157 9.62643 6.62996 9.37919 6.99997C9.13196 7.36998 9 7.80499 9 8.25C9 8.84674 9.23705 9.41903 9.65901 9.84099C10.081 10.2629 10.6533 10.5 11.25 10.5ZM11.25 7.5C11.3983 7.5 11.5433 7.54399 11.6667 7.6264C11.79 7.70881 11.8861 7.82594 11.9429 7.96299C11.9997 8.10003 12.0145 8.25083 11.9856 8.39632C11.9566 8.5418 11.8852 8.67544 11.7803 8.78033C11.6754 8.88522 11.5418 8.95665 11.3963 8.98559C11.2508 9.01453 11.1 8.99968 10.963 8.94291C10.8259 8.88614 10.7088 8.79001 10.6264 8.66668C10.544 8.54334 10.5 8.39834 10.5 8.25C10.5 8.05109 10.579 7.86032 10.7197 7.71967C10.8603 7.57902 11.0511 7.5 11.25 7.5Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="text-[12px] font-[500] !text-current">
            {t('ai', 'AI')} Image
          </div>
        </div>
      </Button>
      {value.length >= 30 && !loading && (
        <div className="text-[12px] ms-[10px] -mt-[10px] w-[200px] absolute top-[100%] z-[500] start-0 hidden group-hover:block">
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
