import type { TextStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export type ThemeColors = typeof Colors.light;

export type Tone = 'neutral' | 'tint' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  heading: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 21,
  },
  bodyStrong: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  captionStrong: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  footnote: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export type ToneStyle = {
  background: string;
  border: string;
  foreground: string;
};

export function toneStyle(colors: ThemeColors, tone: Tone): ToneStyle {
  switch (tone) {
    case 'tint':
      return { background: colors.tintSoft, border: colors.tint, foreground: colors.tint };
    case 'accent':
      return { background: colors.accentSoft, border: colors.accent, foreground: colors.accent };
    case 'success':
      return { background: colors.successSoft, border: colors.success, foreground: colors.success };
    case 'warning':
      return { background: colors.warningSoft, border: colors.warning, foreground: colors.warning };
    case 'danger':
      return { background: colors.dangerSoft, border: colors.danger, foreground: colors.danger };
    case 'info':
      return { background: colors.infoSoft, border: colors.info, foreground: colors.info };
    case 'neutral':
    default:
      return { background: colors.surfaceMuted, border: colors.border, foreground: colors.mutedText };
  }
}

export function useTheme() {
  const scheme = useColorScheme();

  return {
    colors: Colors[scheme],
    radius,
    scheme,
    spacing,
    typography,
  } as const;
}
