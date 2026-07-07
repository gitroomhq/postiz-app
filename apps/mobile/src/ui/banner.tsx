import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { motion } from '@/src/ui/motion';
import { AppText } from '@/src/ui/text';
import { radius, spacing, toneStyle, useTheme } from '@/src/ui/theme';
import type { Tone } from '@/src/ui/theme';

export type BannerKind = 'error' | 'success' | 'info';

type BannerProps = {
  kind: BannerKind;
  message: string;
};

const kindTone: Record<BannerKind, Tone> = {
  error: 'danger',
  info: 'info',
  success: 'success',
};

export function Banner({ kind, message }: BannerProps) {
  const { colors } = useTheme();
  const toned = toneStyle(colors, kindTone[kind]);

  return (
    <Animated.View
      entering={FadeInDown.duration(motion.duration.fast)}
      style={[styles.banner, { backgroundColor: toned.background }]}>
      <View style={[styles.dot, { backgroundColor: toned.foreground }]} />
      <AppText style={[styles.message, { color: toned.foreground }]} variant="captionStrong">
        {message}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
  },
  dot: {
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  message: {
    flex: 1,
  },
});
