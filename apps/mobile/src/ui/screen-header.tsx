import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/ui/text';
import { spacing } from '@/src/ui/theme';

type ScreenHeaderProps = {
  kicker?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function ScreenHeader({ kicker, right, subtitle, title }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {kicker ? (
          <AppText numberOfLines={1} tone="muted" variant="label">
            {kicker}
          </AppText>
        ) : null}
        <AppText variant="display">{title}</AppText>
        {subtitle ? (
          <AppText numberOfLines={1} tone="muted" variant="caption">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  row: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
