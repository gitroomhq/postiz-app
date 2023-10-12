import { FC } from 'react';
import { ButtonProps } from '@tremor/react';
import clsx from 'clsx';

export const Button: FC<ButtonProps> = (props) => {
  return (
    <button
      {...props}
      className={clsx(
        'text-base h-8 pl-3 pr-3 rounded-md gap-1 font-semibold bg-button-purple text-white backdrop-blur-lg hover:opacity-70 inline-flex items-center justify-center select-none disabled:cursor-not-allowed disabled:opacity-70 transition ease-in-out duration-200 cursor-pointer',
        props.className
      )}
    />
  );
};
