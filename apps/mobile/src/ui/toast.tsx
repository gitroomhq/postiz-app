import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { motion } from '@/src/ui/motion';
import { AppText } from '@/src/ui/text';
import { radius, spacing, toneStyle, useTheme } from '@/src/ui/theme';
import type { Tone } from '@/src/ui/theme';

export type ToastKind = 'error' | 'success' | 'info';

type ToastProps = {
  kind: ToastKind;
  message?: string | null;
  durationMs?: number;
};

const kindTone: Record<ToastKind, Tone> = {
  error: 'danger',
  info: 'info',
  success: 'success',
};

export function Toast({ durationMs = 3600, kind, message }: ToastProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(!!message);

  useEffect(() => {
    setVisible(!!message);

    if (!message || durationMs <= 0) {
      return undefined;
    }

    const timeout = setTimeout(() => setVisible(false), durationMs);

    return () => clearTimeout(timeout);
  }, [durationMs, message]);

  if (!message || !visible) {
    return null;
  }

  const toned = toneStyle(colors, kindTone[kind]);

  return (
    <Animated.View
      entering={FadeInUp.duration(motion.duration.normal).easing(motion.easing.standard)}
      exiting={FadeOutUp.duration(motion.duration.fast)}
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + spacing.md }]}>
      <View
        style={[
          styles.toast,
          {
            backgroundColor: colors.surface,
            borderColor: toned.border,
            shadowColor: colors.shadow,
          },
        ]}>
        <View style={[styles.rail, { backgroundColor: toned.foreground }]} />
        <View style={[styles.dot, { backgroundColor: toned.background }]}>
          <View style={[styles.dotInner, { backgroundColor: toned.foreground }]} />
        </View>
        <AppText style={[styles.message, { color: kind === 'error' ? colors.danger : colors.text }]} variant="captionStrong">
          {message}
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dot: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  dotInner: {
    borderRadius: radius.pill,
    height: 7,
    width: 7,
  },
  message: {
    flex: 1,
  },
  rail: {
    bottom: 8,
    left: 8,
    position: 'absolute',
    top: 8,
    width: 3,
  },
  toast: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 54,
    overflow: 'hidden',
    paddingBottom: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    paddingTop: spacing.md,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  wrap: {
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    zIndex: 50,
  },
});
