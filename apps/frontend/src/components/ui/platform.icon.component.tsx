import { FC } from 'react';
import clsx from 'clsx';

// No 'use client': no hooks, so the server-rendered public preview page can use
// it too.

// Platforms that only allow their official mark: its own shape and colors,
// never rounded, cropped, recolored, dimmed or covered, on one solid
// background and never under a minimum height.
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
    // the mark is never shown under this height, whatever the size of the
    // square icon of the other platforms is
    minHeight: number;
    // the mark has to be clickable: where a click does nothing else, it opens
    // the channel (by its id or its handle), or the home page of the platform
    // when the channel has neither
    link: (channel: string) => string;
  }
> = {
  youtube: {
    src: '/icons/platforms/youtube.svg',
    whiteSrc: '/icons/platforms/youtube-white.svg',
    blackSrc: '/icons/platforms/youtube-black.svg',
    ratio: 396.533 / 277.776,
    // "The minimum height for digital media is 20 dp (20 px)", the YouTube API
    // compliance review measures it on every icon
    minHeight: 20,
    link: (channel) =>
      /^UC[\w-]{22}$/.test(channel)
        ? `https://www.youtube.com/channel/${channel}`
        : /^@[^\s/?#\\]+$/.test(channel)
        ? `https://www.youtube.com/${encodeURI(channel)}`
        : 'https://www.youtube.com',
  },
};

// A brand mark can't be dimmed (opacity, grayscale) with its channel: the
// caller dims the avatar instead of their common wrapper and passes `inactive`.
export const isBrandMark = (identifier?: string) =>
  !!brandMarks[identifier || ''];

// The platform icon of a channel. `className` positions it, `iconClassName`
// styles the square icon (rounding, border). A brand mark is at least as wide
// as the square icon and never under its minimum height, so it is bigger than
// a small one: it ignores `iconClassName` and takes `markClassName` instead
// (its solid background). While `inactive` it shows its monochrome version, on
// a colored background (`white`) the white one, and with a `channel` (its id
// or handle) it links to it.
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

  const fullWidth = Math.max(size, mark.minHeight * mark.ratio);
  const width = Math.round(fullWidth * 100) / 100;
  const height = Math.round((fullWidth / mark.ratio) * 100) / 100;
  const style = { width, height, minWidth: width, minHeight: height };
  const href = typeof channel === 'string' ? mark.link(channel) : undefined;
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
    // dark is the default theme, a `.light` ancestor switches to the dark mark
    <>
      <img
        src={mark.blackSrc}
        alt={identifier}
        className="hidden max-w-none [.light_&]:block"
        style={style}
      />
      <img
        src={mark.whiteSrc}
        alt={identifier}
        className="block max-w-none [.light_&]:hidden"
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
    <span className={clsx(markClass, 'pointer-events-none')}>{images}</span>
  );
};
