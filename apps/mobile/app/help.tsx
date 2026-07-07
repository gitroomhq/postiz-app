import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { runtimeConfig } from '@/src/config/runtime';
import {
  AppText,
  Button,
  Card,
  ListRow,
  motion,
  PostizLogo,
  Screen,
  ScreenHeader,
  spacing,
  Toast,
  useTheme,
} from '@/src/ui';

const helpLinks = [
  {
    icon: { android: 'menu_book', ios: 'book', web: 'menu_book' },
    subtitle: 'Provider setup, publishing, and API docs',
    title: 'Postiz documentation',
    url: 'https://docs.postiz.com',
  },
  {
    icon: { android: 'verified_user', ios: 'checkmark.shield', web: 'verified_user' },
    subtitle: 'Terms of service for Postiz accounts',
    title: 'Terms of service',
    url: 'https://postiz.com/terms',
  },
  {
    icon: { android: 'lock', ios: 'lock.shield', web: 'lock' },
    subtitle: 'How Postiz handles account and usage data',
    title: 'Privacy policy',
    url: 'https://postiz.com/privacy',
  },
] as const;

export default function HelpScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();

  async function openUrl(url: string) {
    setError(undefined);

    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Could not open link.');
    }
  }

  return (
    <>
      <Screen inset>
        <Animated.View entering={FadeInDown.duration(motion.duration.normal)} style={styles.stack}>
          <ScreenHeader kicker="Support" subtitle="Docs, recovery options, and account links." title="Help" />

          <Card gap={spacing.lg} padding="lg">
            <View style={styles.brandRow}>
              <PostizLogo size={58} />
              <View style={styles.brandCopy}>
                <AppText variant="heading">Postiz Mobile</AppText>
                <AppText tone="muted" variant="caption">
                  Use the mobile app for schedule checks, channel recovery, and phone-media publishing.
                </AppText>
              </View>
            </View>
            <View style={styles.actions}>
              <Button flex label="Open web app" onPress={() => openUrl(runtimeConfig.frontendUrl)} variant="secondary" />
              <Button flex label="Back" onPress={() => router.back()} variant="ghost" />
            </View>
          </Card>

          <View style={styles.section}>
            <AppText tone="muted" variant="label">
              Resources
            </AppText>
            <Card padding="none">
              {helpLinks.map((link, index) => (
                <ListRow
                  divider={index < helpLinks.length - 1}
                  key={link.title}
                  leading={
                    <View style={[styles.rowIcon, { backgroundColor: colors.tintSoft }]}>
                      <SymbolView name={link.icon} size={20} tintColor={colors.tint} />
                    </View>
                  }
                  onPress={() => openUrl(link.url)}
                  subtitle={link.subtitle}
                  title={link.title}
                  trailing={<AppText tone="tint" variant="captionStrong">Open</AppText>}
                />
              ))}
            </Card>
          </View>

          <Card gap={spacing.sm} padding="lg" tone="info">
            <AppText variant="heading">Having trouble connecting channels?</AppText>
            <AppText tone="muted" variant="caption">
              Confirm your backend and frontend URLs are reachable from the phone, then retry the channel
              connection from Integrations.
            </AppText>
          </Card>
        </Animated.View>
      </Screen>
      <Toast kind="error" message={error} />
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  brandCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  section: {
    gap: spacing.sm,
  },
  stack: {
    gap: spacing.xl,
  },
});
