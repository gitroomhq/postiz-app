import type { ReactElement, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { RefreshControlProps, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/src/ui/theme';

type ScreenProps = {
  children: ReactNode;
  /**
   * - `scroll`: content in a ScrollView (default)
   * - `fixed`: plain view; use for screens that own a FlatList
   * - `form`: keyboard-avoiding ScrollView for screens with text inputs
   */
  variant?: 'scroll' | 'fixed' | 'form';
  /** Apply the top safe-area inset. Use on screens without a native header. */
  inset?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Center content vertically (login and empty full-screen states). */
  centered?: boolean;
};

export function Screen({
  centered = false,
  children,
  contentStyle,
  inset = false,
  refreshControl,
  variant = 'scroll',
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const paddingTop = inset ? insets.top + spacing.sm : spacing.lg;

  if (variant === 'fixed') {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop }]}>
        <View style={[styles.fixedContent, contentStyle]}>{children}</View>
      </View>
    );
  }

  const scroll = (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop },
        centered && styles.centered,
        contentStyle,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps={variant === 'form' ? 'handled' : undefined}
      refreshControl={refreshControl}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      {children}
    </ScrollView>
  );

  if (variant === 'form') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        style={styles.screen}>
        {scroll}
      </KeyboardAvoidingView>
    );
  }

  return scroll;
}

const styles = StyleSheet.create({
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  fixedContent: {
    flex: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.xl,
    paddingBottom: spacing.xxxl + spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
