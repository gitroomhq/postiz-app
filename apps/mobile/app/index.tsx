import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { getOnboardingComplete } from '@/src/services/onboarding.service';
import { useAuthStore } from '@/src/stores/auth.store';
import { PostizLogo, Screen, spacing, useTheme } from '@/src/ui';

export default function IndexRoute() {
  const { colors } = useTheme();
  const status = useAuthStore((state) => state.status);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    let active = true;

    getOnboardingComplete()
      .then((complete) => {
        if (!active) return;
        setOnboardingComplete(complete);
      })
      .finally(() => {
        if (!active) return;
        setOnboardingChecked(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (status === 'bootstrapping' || !onboardingChecked) {
    return (
      <Screen centered contentStyle={{ alignItems: 'center', gap: spacing.lg }} inset>
        <PostizLogo size={74} />
        <ActivityIndicator color={colors.tint} />
      </Screen>
    );
  }

  if (status === 'authenticated') {
    return <Redirect href="/calendar" />;
  }

  return <Redirect href={onboardingComplete ? '/auth/login' : '/onboarding'} />;
}
