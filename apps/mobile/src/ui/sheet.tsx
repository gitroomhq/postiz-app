import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BottomSheet, RNHostView } from '@expo/ui';
import type { SnapPoint } from '@expo/ui';

import { AppText } from '@/src/ui/text';
import { radius, spacing, useTheme } from '@/src/ui/theme';

type AppSheetProps = {
  isPresented: boolean;
  onDismiss: () => void;
  title?: string;
  subtitle?: string;
  snapPoints?: SnapPoint[];
  scroll?: boolean;
  children: ReactNode;
};

/**
 * Postiz-styled bottom sheet built on the native `@expo/ui` BottomSheet
 * (SwiftUI on iOS, Material on Android, DOM on web). Content is regular
 * React Native, bridged through RNHostView.
 */
export function AppSheet({
  children,
  isPresented,
  onDismiss,
  scroll = true,
  snapPoints,
  subtitle,
  title,
}: AppSheetProps) {
  const { colors } = useTheme();
  const { height, width } = useWindowDimensions();
  const sheetWidth = Math.max(280, Math.min(width - spacing.xl * 2, 560));
  const maxHeight = Math.max(280, Math.min(height * 0.74, 640));
  const content = (
    <>
      {title ? (
        <View style={styles.header}>
          <AppText variant="title">{title}</AppText>
          {subtitle ? (
            <AppText tone="muted" variant="caption">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {children}
    </>
  );

  return (
    <BottomSheet isPresented={isPresented} onDismiss={onDismiss} snapPoints={snapPoints}>
      <RNHostView matchContents>
        <View
          style={[
            styles.shell,
            { backgroundColor: colors.surface, maxHeight, width: sheetWidth },
            Platform.OS === 'web' && styles.webRounding,
          ]}>
          {scroll ? (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {content}
            </ScrollView>
          ) : (
            <View style={styles.content}>{content}</View>
          )}
        </View>
      </RNHostView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.xs,
  },
  shell: {
    alignSelf: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  webRounding: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
});
