import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { ScalePressable } from '@/src/ui/scale-pressable';
import { AppText } from '@/src/ui/text';
import { radius, spacing, useTheme } from '@/src/ui/theme';

type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
type ButtonSize = 'lg' | 'md' | 'sm';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  /** Stretch to fill the row. */
  flex?: boolean;
  style?: StyleProp<ViewStyle>;
};

const heights: Record<ButtonSize, number> = { lg: 48, md: 44, sm: 34 };

export function Button({
  disabled = false,
  flex = false,
  icon,
  label,
  loading = false,
  onPress,
  size = 'md',
  style,
  variant = 'primary',
}: ButtonProps) {
  const { colors } = useTheme();

  const palette: Record<ButtonVariant, { background: string; border?: string; text: string }> = {
    danger: { background: colors.dangerSoft, text: colors.danger },
    ghost: { background: 'transparent', text: colors.tint },
    primary: { background: colors.tint, text: '#ffffff' },
    secondary: { background: colors.surface, border: colors.border, text: colors.text },
    soft: { background: colors.tintSoft, text: colors.tint },
  };
  const config = palette[variant];
  const blocked = disabled || loading;

  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: blocked }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: config.background,
          borderColor: config.border ?? 'transparent',
          borderWidth: config.border ? 1 : 0,
          height: heights[size],
          opacity: disabled && !loading ? 0.5 : pressed ? 0.9 : 1,
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
        },
        flex && styles.flex,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={config.text} size="small" />
      ) : (
        <View style={styles.content}>
          {icon}
          <AppText
            style={{ color: config.text }}
            variant={size === 'sm' ? 'captionStrong' : 'bodyStrong'}>
            {label}
          </AppText>
        </View>
      )}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
