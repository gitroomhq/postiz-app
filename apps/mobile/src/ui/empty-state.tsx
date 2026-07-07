import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/src/ui/card';
import { AppText } from '@/src/ui/text';
import { spacing } from '@/src/ui/theme';

type EmptyStateProps = {
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ action, body, title }: EmptyStateProps) {
  return (
    <Card gap={spacing.xs} padding="lg">
      <AppText variant="heading">{title}</AppText>
      <AppText tone="muted" variant="caption">
        {body}
      </AppText>
      {action ? <View style={styles.action}>{action}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  action: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
});
