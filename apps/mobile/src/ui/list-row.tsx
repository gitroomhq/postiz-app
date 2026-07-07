import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { ScalePressable } from '@/src/ui/scale-pressable';
import { AppText } from '@/src/ui/text';
import { spacing, useTheme } from '@/src/ui/theme';

type ListRowProps = {
  title: string;
  subtitle?: string;
  subtitleTone?: 'muted' | 'tint' | 'danger' | 'success';
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  divider?: boolean;
  rowStyle?: StyleProp<ViewStyle>;
};

export function ListRow({
  divider = false,
  leading,
  onPress,
  selected = false,
  subtitle,
  subtitleTone = 'muted',
  title,
  trailing,
  rowStyle: rowStyleProp,
}: ListRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      {leading}
      <View style={styles.copy}>
        <AppText numberOfLines={1} variant="bodyStrong">
          {title}
        </AppText>
        {subtitle ? (
          <AppText numberOfLines={1} tone={subtitleTone} variant="footnote">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </>
  );
  const rowStyle = [
    styles.row,
    divider && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
    selected && { backgroundColor: colors.tintSoft },
    rowStyleProp,
  ];

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      pressScale={0.99}
      style={({ pressed }) => [...rowStyle, pressed && { backgroundColor: colors.surfaceMuted }]}>
      {content}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg - 2,
    paddingVertical: spacing.sm + 2,
  },
});
