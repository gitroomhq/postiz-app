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
        'h-8 text-base pl-3 pr-3 rounded-md shadow gap-1 font-semibold bg-button-purple text-white backdrop-blur-lg hover:opacity-70 inline-flex items-center justify-center select-none disabled:cursor-not-allowed disabled:opacity-70 transition ease-in-out duration-200 cursor-pointer',
        props.className
      )}
    />
  );
};
