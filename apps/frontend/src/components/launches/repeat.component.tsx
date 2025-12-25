import { FC, useMemo, useState } from 'react';
import { Select } from '@gitroom/react/form/select';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useClickOutside } from '@mantine/hooks';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import clsx from 'clsx';
const list = [
  {
    value: 1,
    label: 'Day',
  },
  {
    value: 2,
    label: 'Two Days',
  },
  {
    value: 3,
    label: 'Three Days',
  },
  {
    value: 4,
    label: 'Four Days',
  },
  {
    value: 5,
    label: 'Five Days',
  },
  {
    value: 6,
    label: 'Six Days',
  },
  {
    value: 7,
    label: 'Week',
  },
  {
    value: 14,
    label: 'Two Weeks',
  },
  {
    value: 30,
    label: 'Month',
  },
  {
    value: null,
    label: 'Cancel',
  },
];
export const RepeatComponent: FC<{
  repeat: number | null;
  onChange: (newVal: number) => void;
}> = (props) => {
  const { repeat } = props;
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);

  const ref = useClickOutside(() => {
    if (!isOpen) {
      return;
    }
    setIsOpen(false);
  });

  const everyLabel = useMemo(() => {
    if (!repeat) {
      return '';
    }
    return list.find((p) => p.value === repeat)?.label;
  }, [repeat]);

  return (
    <div
      ref={ref}
      className={clsx(
        'border rounded-[8px] justify-center flex items-center relative h-[44px] text-[15px] font-[600] select-none',
        isOpen ? 'border-[#612BD3]' : 'border-newTextColor/10',
      )}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-[16px] justify-center flex gap-[8px] items-center h-full select-none flex-1"
      >
        <div className="cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <g clip-path="url(#clip0_2403_67385)">
              <path
                d="M14.1667 1.66602L17.5 4.99935M17.5 4.99935L14.1667 8.33268M17.5 4.99935H6.5C5.09987 4.99935 4.3998 4.99935 3.86502 5.27183C3.39462 5.51152 3.01217 5.89397 2.77248 6.36437C2.5 6.89915 2.5 7.59922 2.5 8.99935V9.16602M2.5 14.9993H13.5C14.9001 14.9993 15.6002 14.9993 16.135 14.7269C16.6054 14.4872 16.9878 14.1047 17.2275 13.6343C17.5 13.0995 17.5 12.3995 17.5 10.9993V10.8327M2.5 14.9993L5.83333 18.3327M2.5 14.9993L5.83333 11.666"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
            <defs>
              <clipPath id="clip0_2403_67385">
                <rect width="20" height="20" fill="currentColor" />
              </clipPath>
            </defs>
          </svg>
        </div>
        <div className="cursor-pointer">
          {repeat
            ? `Repeat Post Every ${everyLabel}`
            : t('repeat_post_every', 'Repeat Post Every...')}
        </div>
        <div className="cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className={isOpen ? 'rotate-180' : ''}
          >
            <path
              d="M7.4563 8L12.5437 8C12.9494 8 13.1526 8.56798 12.8657 8.90016L10.322 11.8456C10.1442 12.0515 9.85583 12.0515 9.67799 11.8456L7.13429 8.90016C6.84741 8.56798 7.05059 8 7.4563 8Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
      {isOpen && (
        <div className="z-[300] absolute left-0 bottom-[100%] w-[240px] bg-newBgColorInner p-[12px] menu-shadow -translate-y-[10px] flex flex-col">
          {list.map((p) => (
            <div
              onClick={() => {
                props.onChange(Number(p.value));
                setIsOpen(false);
              }}
              key={p.label}
              className="h-[40px] py-[8px] px-[20px] -mx-[12px] hover:bg-newBgColor"
            >
              {p.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
