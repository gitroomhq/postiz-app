import { Text } from 'react-native';
import type { TextProps } from 'react-native';

import { useTheme } from '@/src/ui/theme';
import type { TypographyVariant } from '@/src/ui/theme';

export type TextTone =
  | 'default'
  | 'soft'
  | 'muted'
  | 'tint'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'inverse';

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
};

export function AppText({ variant = 'body', tone = 'default', style, ...props }: AppTextProps) {
  const { colors, typography } = useTheme();
  const toneColors: Record<TextTone, string> = {
    accent: colors.accent,
    danger: colors.danger,
    default: colors.text,
    info: colors.info,
    inverse: '#ffffff',
    muted: colors.mutedText,
    soft: colors.textSoft,
    success: colors.success,
    tint: colors.tint,
    warning: colors.warning,
  };

  return <Text {...props} style={[typography[variant], { color: toneColors[tone] }, style]} />;
}
