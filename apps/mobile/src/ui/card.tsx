import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { ScalePressable } from '@/src/ui/scale-pressable';
import { radius, spacing, toneStyle, useTheme } from '@/src/ui/theme';
import type { Tone } from '@/src/ui/theme';

type CardProps = {
  children: ReactNode;
  /** Colors the border (and optionally the background with `soft`). */
  tone?: Tone | 'default';
  /** Fill the card with the tone's soft background. */
  soft?: boolean;
  /** Use the inset surface instead of the raised one. */
  inset?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  gap?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const paddings = { lg: spacing.xl, md: spacing.lg, none: 0, sm: spacing.md } as const;

export function Card({
  accessibilityLabel,
  children,
  gap = spacing.md,
  inset = false,
  onPress,
  padding = 'md',
  soft = false,
  style,
  tone = 'default',
}: CardProps) {
  const { colors } = useTheme();
  const toned = tone !== 'default' ? toneStyle(colors, tone) : null;
  const baseStyle: ViewStyle = {
    backgroundColor: soft && toned ? toned.background : inset ? colors.surfaceMuted : colors.surface,
    borderColor: toned ? toned.border : colors.border,
    gap,
    padding: paddings[padding],
  };

  if (onPress) {
    return (
      <ScalePressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          baseStyle,
          pressed && { backgroundColor: colors.surfaceMuted },
          style,
        ]}>
        {children}
      </ScalePressable>
    );
  }

  return <View style={[styles.card, baseStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderCurve: 'continuous',
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
