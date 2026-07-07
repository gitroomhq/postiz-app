import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/ui/text';
import { radius, spacing, toneStyle, useTheme } from '@/src/ui/theme';
import type { Tone } from '@/src/ui/theme';

type StatusBadgeProps = {
  label: string;
  tone?: Tone;
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const { colors } = useTheme();
  const toned = toneStyle(colors, tone);

  return (
    <View style={[styles.badge, { backgroundColor: toned.background }]}>
      <AppText style={{ color: tone === 'neutral' ? colors.textSoft : toned.foreground }} variant="footnote">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderCurve: 'continuous',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
});
