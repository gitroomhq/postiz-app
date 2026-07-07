import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ScalePressable } from '@/src/ui/scale-pressable';
import { radius, useTheme } from '@/src/ui/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type IconButtonProps = {
  name: SymbolName;
  onPress: () => void;
  accessibilityLabel: string;
  tint?: string;
  size?: number;
};

export function IconButton({ accessibilityLabel, name, onPress, size = 38, tint }: IconButtonProps) {
  const { colors } = useTheme();

  return (
    <ScalePressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
          height: size,
          width: size,
        },
      ]}>
      <SymbolView name={name} size={Math.round(size * 0.5)} tintColor={tint ?? colors.text} />
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
