import { FC, useCallback } from 'react';
import clsx from 'clsx';
const Arrow: FC<{
  flip: boolean;
}> = (props) => {
  const { flip } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={{
        transform: flip ? 'rotate(180deg)' : '',
      }}
    >
      <path
        d="M13.354 6.35378L8.35403 11.3538C8.30759 11.4003 8.25245 11.4372 8.19175 11.4623C8.13105 11.4875 8.06599 11.5004 8.00028 11.5004C7.93457 11.5004 7.86951 11.4875 7.80881 11.4623C7.74811 11.4372 7.69296 11.4003 7.64653 11.3538L2.64653 6.35378C2.55271 6.25996 2.5 6.13272 2.5 6.00003C2.5 5.86735 2.55271 5.7401 2.64653 5.64628C2.74035 5.55246 2.8676 5.49976 3.00028 5.49976C3.13296 5.49976 3.26021 5.55246 3.35403 5.64628L8.00028 10.2932L12.6465 5.64628C12.693 5.59983 12.7481 5.56298 12.8088 5.53784C12.8695 5.5127 12.9346 5.49976 13.0003 5.49976C13.066 5.49976 13.131 5.5127 13.1917 5.53784C13.2524 5.56298 13.3076 5.59983 13.354 5.64628C13.4005 5.69274 13.4373 5.74789 13.4625 5.80859C13.4876 5.86928 13.5006 5.93434 13.5006 6.00003C13.5006 6.06573 13.4876 6.13079 13.4625 6.19148C13.4373 6.25218 13.4005 6.30733 13.354 6.35378Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const UpDownArrow: FC<{
  isUp: boolean;
  isDown: boolean;
  onChange: (type: 'up' | 'down') => void;
}> = (props) => {
  const { isUp, isDown, onChange } = props;
  const changePosition = useCallback(
    (type: 'up' | 'down') => () => {
      onChange(type);
    },
    []
  );
  return (
    <div className="flex flex-col">
      <button
        onClick={changePosition('up')}
        className={clsx(
          'outline-none rounded-tl-[20px] rounded-tr-[20px] w-[24px] h-[24px] flex justify-center items-center',
          isUp
            ? 'bg-input hover:bg-seventh cursor-pointer'
            : 'bg-customColor8 pointer-events-none text-textColor'
        )}
      >
        <Arrow flip={true} />
      </button>
      <button
        onClick={changePosition('down')}
        className={clsx(
          'outline-none rounded-bl-[20px] rounded-br-[20px] w-[24px] h-[24px] flex justify-center items-center',
          isDown
            ? 'bg-input hover:bg-seventh cursor-pointer'
            : 'bg-customColor8 pointer-events-none text-textColor'
        )}
      >
        <Arrow flip={false} />
      </button>
    </div>
  );
};
