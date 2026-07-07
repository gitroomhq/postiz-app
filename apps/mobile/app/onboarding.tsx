import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Redirect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { saveOnboardingComplete } from '@/src/services/onboarding.service';
import { useAuthStore } from '@/src/stores/auth.store';
import {
  AppText,
  Button,
  Card,
  Chip,
  motion,
  PostizLogo,
  Screen,
  spacing,
  useTheme,
} from '@/src/ui';

const steps = [
  {
    body: 'Scan scheduled, draft, failed, and published posts without opening the desktop calendar.',
    chips: ['Scheduled', 'Failed', 'Drafts'],
    icon: { android: 'calendar_month', ios: 'calendar', web: 'calendar_month' },
    metric: '7d',
    title: 'Your publishing queue, compressed for mobile.',
  },
  {
    body: 'Pick channels, attach phone media, save drafts, or schedule from the same thumb-reachable flow.',
    chips: ['Channels', 'Media', 'Schedule'],
    icon: { android: 'edit_note', ios: 'square.and.pencil', web: 'edit_note' },
    metric: '+',
    title: 'Compose from the device already in your hand.',
  },
  {
    body: 'Push alerts and failed-post recovery routes keep reconnects and fixes close to the notification.',
    chips: ['Alerts', 'Reconnect', 'Retry'],
    icon: { android: 'notifications', ios: 'bell.badge', web: 'notifications' },
    metric: '!',
    title: 'Recover problems before the schedule slips.',
  },
] as const;

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const [stepIndex, setStepIndex] = useState(0);
  const current = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  if (status === 'bootstrapping') {
    return null;
  }

  async function finish() {
    await saveOnboardingComplete();
    router.replace(status === 'authenticated' ? '/calendar' : '/auth/login');
  }

  if (status === 'authenticated' && stepIndex === 0) {
    return <Redirect href="/calendar" />;
  }

  return (
    <Screen contentStyle={styles.screenContent} inset>
      <View style={styles.topRow}>
        <PostizLogo size={58} />
        <Button label="Skip" onPress={finish} size="sm" variant="ghost" />
      </View>

      <Animated.View
        entering={FadeIn.duration(motion.duration.normal)}
        exiting={FadeOut.duration(motion.duration.fast)}
        key={stepIndex}
        style={styles.stack}>
        <View style={styles.copy}>
          <AppText tone="muted" variant="label">
            Postiz Mobile
          </AppText>
          <AppText variant="display">{current.title}</AppText>
          <AppText tone="muted" variant="body">
            {current.body}
          </AppText>
        </View>

        <Card gap={spacing.xl} padding="lg" style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View style={[styles.previewIcon, { backgroundColor: colors.tintSoft }]}>
              <SymbolView name={current.icon} size={24} tintColor={colors.tint} />
            </View>
            <View style={styles.previewTitle}>
              <AppText variant="heading">Workflow signal</AppText>
              <AppText tone="muted" variant="caption">
                Built for quick checks and quick recovery.
              </AppText>
            </View>
            <View style={[styles.metric, { backgroundColor: colors.surfaceInset }]}>
              <AppText tone="tint" variant="heading">
                {current.metric}
              </AppText>
            </View>
          </View>

          <View style={styles.timeline}>
            {current.chips.map((chip, index) => (
              <View key={chip} style={styles.timelineRow}>
                <View style={[styles.timelineDot, { backgroundColor: index === 0 ? colors.tint : colors.borderStrong }]} />
                <View style={styles.timelineCopy}>
                  <AppText variant="bodyStrong">{chip}</AppText>
                  <AppText tone="muted" variant="caption">
                    {index === 0 ? 'Primary action' : 'Available from the same flow'}
                  </AppText>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.chips}>
            {current.chips.map((chip, index) => (
              <Chip key={chip} label={chip} selected={index === 0} />
            ))}
          </View>
        </Card>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {steps.map((step, index) => (
            <View
              key={step.title}
              style={[
                styles.dot,
                {
                  backgroundColor: index === stepIndex ? colors.tint : colors.borderStrong,
                  width: index === stepIndex ? 22 : 7,
                },
              ]}
            />
          ))}
        </View>
        <Button
          label={isLast ? 'Sign in' : 'Continue'}
          onPress={isLast ? finish : () => setStepIndex((value) => value + 1)}
          size="lg"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  copy: {
    gap: spacing.sm,
  },
  dot: {
    borderRadius: 999,
    height: 7,
  },
  dots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  footer: {
    gap: spacing.lg,
  },
  metric: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 13,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  previewCard: {
    overflow: 'hidden',
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  previewIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  previewTitle: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  screenContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  stack: {
    gap: spacing.xxl,
  },
  timeline: {
    gap: spacing.md,
  },
  timelineCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  timelineDot: {
    borderRadius: 6,
    height: 12,
    marginTop: 4,
    width: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
