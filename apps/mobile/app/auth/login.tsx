import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useAuthStore } from '@/src/stores/auth.store';
import {
  AppText,
  Button,
  Card,
  Field,
  motion,
  PostizLogo,
  Screen,
  spacing,
  Toast,
} from '@/src/ui';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (status === 'authenticated') {
    return <Redirect href="/calendar" />;
  }

  const isSubmitting = status === 'bootstrapping';

  return (
    <>
      <Screen centered variant="form">
        <Animated.View
          entering={FadeIn.duration(motion.duration.normal)}
          exiting={FadeOut.duration(motion.duration.fast)}
          style={styles.shell}>
          <View style={styles.brandBlock}>
            <View style={styles.brandRow}>
              <PostizLogo size={54} />
              <View style={styles.brandCopy}>
                <AppText tone="muted" variant="label">
                  Postiz Mobile
                </AppText>
                <AppText variant="display">Sign in</AppText>
              </View>
            </View>
            <AppText tone="muted" variant="body">
              Manage posts, channels, and alerts with your existing Postiz account.
            </AppText>
          </View>

          <Card gap={spacing.lg} padding="lg">
            <Field
              autoCapitalize="none"
              autoComplete="email"
              editable={!isSubmitting}
              inputMode="email"
              label="Email"
              onChangeText={setEmail}
              placeholder="you@company.com"
              value={email}
            />
            <Field
              autoCapitalize="none"
              editable={!isSubmitting}
              label="Password"
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry
              value={password}
            />
            <View style={styles.recoveryRow}>
              <AppText tone="muted" variant="caption">
                Cannot access your account?
              </AppText>
              <Button
                label="Reset password"
                onPress={() => router.push('/auth/recover')}
                size="sm"
                variant="ghost"
              />
            </View>

            <Button
              disabled={!email || !password}
              label="Continue"
              loading={isSubmitting}
              onPress={() => login({ email, password })}
              size="lg"
            />
          </Card>
        </Animated.View>
      </Screen>
      <Toast kind="error" message={error} />
    </>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
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
  recoveryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: -spacing.xs,
  },
  shell: {
    gap: spacing.xxl,
    width: '100%',
  },
});
