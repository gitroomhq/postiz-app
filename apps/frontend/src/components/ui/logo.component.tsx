import clsx from 'clsx';

/** major.minor from NEXT_PUBLIC_APP_VERSION (falls back to package 3.0.2 → v3.0). */
export const appVersionLabel = (() => {
  const raw = process.env.NEXT_PUBLIC_APP_VERSION || '3.0.2';
  const [major, minor] = raw.split('.');
  return `v${major}.${minor ?? '0'}`;
})();

/**
 * Crown mark. Identical geometry to the landing site's CrownGlyph
 * (postqueen.ai/src/components/doodles.tsx) so both properties draw the same
 * crown; `currentColor` lets the caller decide the fill.
 */
export const CrownGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <path
      d="M3.4 16.6 L4.8 7.4 L8.6 11 L12 5 L15.4 11 L19.2 7.4 L20.6 16.6 Z"
      fill="currentColor"
    />
    <rect
      x="3.8"
      y="17.8"
      width="16.4"
      height="2.4"
      rx="1.2"
      fill="currentColor"
    />
  </svg>
);

/**
 * The brand logo, single source for both the app rail and the auth screens.
 * Solid purple tile + crown, matching the landing site's logo
 * (postqueen.ai/src/components/logo.tsx) so the marketing site and the product
 * read as one brand.
 */
export const PostQueenLogo = ({
  wordmark = false,
  tileClassName = 'size-9',
  glyphClassName = 'size-5',
  wordClassName = 'text-[22px]',
  className,
}: {
  /** Render the "postqueen" wordmark next to the mark. */
  wordmark?: boolean;
  tileClassName?: string;
  glyphClassName?: string;
  wordClassName?: string;
  className?: string;
}) => (
  <span className={clsx('flex items-center gap-[10px]', className)}>
    <span
      className={clsx(
        'bg-btnPrimary grid shrink-0 place-items-center rounded-[0.65rem] shadow-[0_6px_16px_-4px_rgba(124,58,237,0.45)]',
        tileClassName
      )}
    >
      <CrownGlyph className={clsx('text-white', glyphClassName)} />
    </span>
    {wordmark && (
      <span
        className={clsx(
          'font-display font-extrabold leading-none tracking-tight',
          wordClassName
        )}
      >
        postqueen
      </span>
    )}
  </span>
);
