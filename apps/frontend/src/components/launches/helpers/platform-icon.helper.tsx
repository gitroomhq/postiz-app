import { FC } from 'react';
import SafeImage from '@gitroom/react/helpers/safe.image';

/**
 * Helper to extract real platform from Zernio provider identifiers.
 * e.g. 'zernio-tiktok' -> { platform: 'tiktok', isZernio: true }
 *      'instagram'     -> { platform: 'instagram', isZernio: false }
 */
export function getPlatformFromIdentifier(identifier: string) {
  if (identifier.startsWith('zernio-')) {
    return { platform: identifier.replace('zernio-', ''), isZernio: true };
  }
  return { platform: identifier, isZernio: false };
}

/**
 * Returns the icon path for a given provider identifier.
 * Zernio providers use the underlying platform icon.
 */
export function getPlatformIconPath(identifier: string) {
  const { platform } = getPlatformFromIdentifier(identifier);
  if (platform === 'youtube') return '/icons/platforms/youtube.svg';
  return `/icons/platforms/${platform}.png`;
}

// Small Zernio logo used as overlay badge on platform icons.
const ZernioBadge: FC<{ size?: number; borderRadius?: number }> = ({
  size = 16,
  borderRadius,
}) => (
  <span
    className="absolute z-20 top-[-3px] -end-[3px] flex items-center justify-center bg-[#EB3514] border border-white/30"
    style={{
      width: size,
      height: size,
      borderRadius: borderRadius !== undefined ? borderRadius : '9999px',
    }}
  >
    <img
      src="/icons/platforms/zernio-icon.svg"
      alt="zernio"
      style={{ width: size * 0.72, height: size * 0.72 }}
    />
  </span>
);

/**
 * Reusable platform icon badge component.
 * Renders the correct platform icon for both native and Zernio providers.
 * For Zernio providers, adds a small Zernio logo badge.
 *
 * `zernioBadgeSize` / `zernioBadgeRadius` override the default proportional
 * sizing of the overlay badge for screens that render large platform icons
 * (e.g. repost rules list) where the default 70% ratio ends up covering the
 * underlying platform icon.
 */
export const PlatformIconBadge: FC<{
  identifier: string;
  size?: number;
  className?: string;
  zernioBadgeSize?: number;
  zernioBadgeRadius?: number;
}> = ({
  identifier,
  size = 18,
  className = '',
  zernioBadgeSize,
  zernioBadgeRadius,
}) => {
  const { platform, isZernio } = getPlatformFromIdentifier(identifier);
  const badgeSize =
    zernioBadgeSize !== undefined
      ? zernioBadgeSize
      : Math.max(10, Math.round(size * 0.7));
  return (
    <>
      {platform === 'youtube' ? (
        <img
          src="/icons/platforms/youtube.svg"
          className={className}
          width={size}
          alt="youtube"
        />
      ) : (
        <SafeImage
          src={`/icons/platforms/${platform}.png`}
          className={`rounded-full ${className}`}
          alt={platform}
          width={size}
          height={size}
        />
      )}
      {isZernio && (
        <ZernioBadge size={badgeSize} borderRadius={zernioBadgeRadius} />
      )}
    </>
  );
};
