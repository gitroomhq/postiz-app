import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { ScalePressable } from '@/src/ui/scale-pressable';
import { AppText } from '@/src/ui/text';
import { radius, spacing, useTheme } from '@/src/ui/theme';

type ChipProps = {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  leading?: ReactNode;
};

export function Chip({ disabled = false, label, leading, onPress, selected = false }: ChipProps) {
  const { colors } = useTheme();

  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.tintSoft : colors.surface,
          borderColor: selected ? colors.tint : colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          paddingLeft: leading ? spacing.sm : spacing.md,
        },
      ]}>
      {leading}
      <AppText
        numberOfLines={1}
        style={{ color: selected ? colors.tint : colors.text }}
        variant="captionStrong">
        {label}
      </AppText>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm - 2,
    height: 34,
    paddingRight: spacing.md,
  },
});
