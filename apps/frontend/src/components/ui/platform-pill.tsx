/**
 * PlatformPill — uniform pill chip for platform identity.
 *
 * Dark surface + white monochrome icon + label. No colored dots,
 * no platform-tinted shadows. Visual brand differentiation comes
 * only from the glyph shape.
 */

import { ReactNode } from 'react';
import {
  PLATFORM_ICONS,
  PLATFORM_LABELS,
  PlatformKey,
} from './platform-icons';

interface PlatformPillProps {
  platform: PlatformKey;
  label?: string;
  iconSize?: number;
  className?: string;
  children?: ReactNode;
}

export function PlatformPill({
  platform,
  label,
  iconSize = 14,
  className = '',
  children,
}: PlatformPillProps) {
  const Icon = PLATFORM_ICONS[platform];
  const resolvedLabel = label ?? PLATFORM_LABELS[platform];

  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-customColor1 border border-borderGlass text-label text-fg hover:border-borderGlassStrong transition-colors ${className}`}
    >
      <Icon size={iconSize} className="text-fg shrink-0" />
      <span className="leading-none">{children ?? resolvedLabel}</span>
    </span>
  );
}
