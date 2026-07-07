import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { AppText, Button, Card, motion, Screen, spacing, useTheme } from '@/src/ui';

export default function NotFoundScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Screen centered inset>
      <Animated.View entering={FadeInDown.duration(motion.duration.normal)}>
        <Card gap={spacing.xl} padding="lg">
          <View style={[styles.icon, { backgroundColor: colors.tintSoft }]}>
            <SymbolView
              name={{ android: 'travel_explore', ios: 'location.slash', web: 'travel_explore' }}
              size={24}
              tintColor={colors.tint}
            />
          </View>

          <View style={styles.copy}>
            <AppText tone="muted" variant="label">
              Missing route
            </AppText>
            <AppText variant="display">Nothing here</AppText>
            <AppText tone="muted" variant="body">
              This mobile screen is not available, or the link points to a route that moved.
            </AppText>
          </View>

          <Button label="Go to calendar" onPress={() => router.replace('/(tabs)/calendar')} />
        </Card>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
