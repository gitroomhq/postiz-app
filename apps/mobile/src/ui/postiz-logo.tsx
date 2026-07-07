import { Image, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { radius, useTheme } from '@/src/ui/theme';

type PostizLogoProps = {
  size?: number;
  framed?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PostizLogo({ framed = false, size = 52, style }: PostizLogoProps) {
  const { colors } = useTheme();

  if (!framed) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={require('../../assets/images/postiz-mark.png')}
        style={[{ height: size, width: size }, style]}
      />
    );
  }

  return (
    <View
      style={[
        styles.frame,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          height: size,
          width: size,
        },
        style,
      ]}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={require('../../assets/images/postiz-mark.png')}
        style={{ height: Math.round(size * 0.78), width: Math.round(size * 0.78) }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
