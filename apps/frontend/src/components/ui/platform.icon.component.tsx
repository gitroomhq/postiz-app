import { FC } from 'react';
import clsx from 'clsx';

// No 'use client': no hooks, so the server-rendered public preview page can use
// it too.

// Platforms that only allow their official mark: its own shape and colors,
// never rounded, cropped, recolored, dimmed or covered, and on one solid
// background.
// YouTube: https://developers.google.com/youtube/terms/branding-guidelines
// (YouTube API Services Developer Policies III.F.2), the files are the official
// icons from https://brand.youtube/youtube-icon
const brandMarks: Record<
  string,
  {
    src: string;
    // the official monochrome versions
    whiteSrc: string;
    blackSrc: string;
    ratio: number;
    // the mark is as wide as the square icon of the other platforms, raise
    // this to never show it under a given height
    minHeight: number;
    // the mark has to be clickable: where a click does nothing else, it opens
    // the channel (by its id or its handle)
    link: (channel: string) => string | undefined;
  }
> = {
  youtube: {
    src: '/icons/platforms/youtube.svg',
    whiteSrc: '/icons/platforms/youtube-white.svg',
    blackSrc: '/icons/platforms/youtube-black.svg',
    ratio: 396.533 / 277.776,
    minHeight: 0,
    link: (channel) =>
      /^UC[\w-]{22}$/.test(channel)
        ? `https://www.youtube.com/channel/${channel}`
        : /^@[\w.-]+$/.test(channel)
        ? `https://www.youtube.com/${channel}`
        : undefined,
  },
};

// A brand mark can't be dimmed (opacity, grayscale) with its channel: the
// caller dims the avatar instead of their common wrapper and passes `inactive`.
export const isBrandMark = (identifier?: string) =>
  !!brandMarks[identifier || ''];

// The platform icon of a channel. `className` positions it, `iconClassName`
// styles the square icon (rounding, border). A brand mark is as wide as the
// square icon, ignores `iconClassName` and takes `markClassName` instead (its
// solid background). While `inactive` it shows its monochrome version, on a
// colored background (`white`) the white one, and with a `channel` (its id or
// handle) it links to it.
export const PlatformIcon: FC<{
  identifier?: string;
  size: number;
  className?: string;
  iconClassName?: string;
  markClassName?: string;
  inactive?: boolean;
  white?: boolean;
  channel?: string;
}> = ({
  identifier,
  size,
  className,
  iconClassName,
  markClassName,
  inactive,
  white,
  channel,
}) => {
  const mark = brandMarks[identifier || ''];

  if (!mark) {
    return (
      <img
        src={`/icons/platforms/${identifier}.png`}
        alt={identifier || ''}
        width={size}
        height={size}
        className={clsx(iconClassName, className)}
      />
    );
  }

  const width = Math.max(size, mark.minHeight * mark.ratio);
  const height = Math.round((width / mark.ratio) * 100) / 100;
  const style = { width, height, minWidth: width, minHeight: height };
  const href = channel && mark.link(channel);
  const markClass = clsx(
    'flex shrink-0 p-[1px] rounded-[3px]',
    className,
    markClassName
  );

  const images = white ? (
    <img
      src={mark.whiteSrc}
      alt={identifier}
      className="block max-w-none"
      style={style}
    />
  ) : inactive ? (
    <>
      <img
        src={mark.blackSrc}
        alt={identifier}
        className="block max-w-none dark:hidden"
        style={style}
      />
      <img
        src={mark.whiteSrc}
        alt={identifier}
        className="hidden max-w-none dark:block"
        style={style}
      />
    </>
  ) : (
    <img
      src={mark.src}
      alt={identifier}
      className="block max-w-none"
      style={style}
    />
  );

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={markClass}
    >
      {images}
    </a>
  ) : (
    <span className={markClass}>{images}</span>
  );
};
