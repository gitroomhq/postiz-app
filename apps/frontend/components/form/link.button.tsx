import {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  FC,
} from 'react';
import clsx from 'clsx';
import { LinkProps } from 'next/dist/client/link';
import Link from 'next/link';

export const LinkButton: FC<
  DetailedHTMLProps<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  > &
    LinkProps
> = (props) => {
  const { ref, ...theRest } = props;
  return (
    <Link
      {...theRest}
      className={clsx(
        'text-sm h-8 pl-3 pr-3 rounded-md gap-1 font-semibold bg-white text-black hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none focus-visible:bg-white/90 disabled:hover:bg-white inline-flex items-center border justify-center select-none disabled:cursor-not-allowed disabled:opacity-70 transition ease-in-out duration-200 cursor-pointer',
        props.className
      )}
    />
  );
};
