import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { requestPasswordReset } from '@/src/api/auth.api';
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
  useTheme,
} from '@/src/ui';

export default function RecoverScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(undefined);
    setSubmitting(true);

    try {
      const response = await requestPasswordReset(email.trim());

      if (!response.forgot) {
        setError(response.error ?? 'Could not send reset email. Check the address and try again.');
        return;
      }

      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send reset email.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Screen centered variant="form">
        <Animated.View entering={FadeInDown.duration(motion.duration.normal)} style={styles.shell}>
          <View style={styles.brandRow}>
            <PostizLogo size={54} />
            <View style={styles.brandCopy}>
              <AppText tone="muted" variant="label">
                Account recovery
              </AppText>
              <AppText variant="display">Reset password</AppText>
            </View>
          </View>

          {sent ? (
            <Card gap={spacing.lg} padding="lg" tone="success">
              <View style={[styles.icon, { backgroundColor: colors.successSoft }]}>
                <SymbolView name={{ android: 'mark_email_read', ios: 'envelope.badge', web: 'mark_email_read' }} size={24} tintColor={colors.success} />
              </View>
              <View style={styles.copy}>
                <AppText variant="heading">Check your email</AppText>
                <AppText tone="muted" variant="body">
                  If that address belongs to a Postiz account, the reset link will open the web reset flow.
                </AppText>
              </View>
              <Button label="Back to sign in" onPress={() => router.replace('/auth/login')} />
            </Card>
          ) : (
            <Card gap={spacing.lg} padding="lg">
              <Field
                autoCapitalize="none"
                autoComplete="email"
                editable={!submitting}
                inputMode="email"
                label="Email"
                onChangeText={setEmail}
                placeholder="you@company.com"
                value={email}
              />
              <Button
                disabled={!email.trim()}
                label="Send reset email"
                loading={submitting}
                onPress={submit}
                size="lg"
              />
              <Button label="Back to sign in" onPress={() => router.replace('/auth/login')} variant="secondary" />
            </Card>
          )}
        </Animated.View>
      </Screen>
      <Toast kind="error" message={error} />
    </>
  );
}

const styles = StyleSheet.create({
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
  copy: {
    gap: spacing.sm,
  },
  icon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  shell: {
    gap: spacing.xxl,
    width: '100%',
  },
});
