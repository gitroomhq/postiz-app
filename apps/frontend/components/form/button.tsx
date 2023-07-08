import { ButtonHTMLAttributes, DetailedHTMLProps, FC } from 'react';
import clsx from 'clsx';

export const Button: FC<
  DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>
> = (props) => {
  return (
    <button
      {...props}
      className={clsx(
        'w-full py-2 px-4 font-semibold rounded shadow bg-gradient-to-br from-[#BADC58] to-[#F1C40F] text-black',
        props.className
      )}
    />
  );
};
