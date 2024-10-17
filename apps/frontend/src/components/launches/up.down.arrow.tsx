import { FC, useCallback } from 'react';
import clsx from 'clsx';

import { ReactComponent as ArrowDownSvg } from '@gitroom/frontend/assets/arrow-down.svg';

const Arrow: FC<{ flip: boolean }> = (props) => {
  const { flip } = props;
  return <ArrowDownSvg style={{ transform: flip ? 'rotate(180deg)' : '' }} />;
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
