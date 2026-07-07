import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { queryClient } from '@/src/providers/query-client';
import { AppText, Button, Card, motion, Screen, spacing } from '@/src/ui';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function IntegrationDoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const message = getSingleParam(params.msg) || getSingleParam(params.message);
  const precondition = getSingleParam(params.precondition) === 'true';
  const added = getSingleParam(params.added);

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ['integrations'] });
  }, []);

  return (
    <Screen centered inset>
      <Animated.View entering={FadeInDown.duration(motion.duration.normal)}>
        <Card gap={spacing.xl} padding="lg">
          <View style={styles.copy}>
            <AppText tone={precondition ? 'danger' : 'tint'} variant="label">
              {precondition ? 'Action needed' : 'Channel updated'}
            </AppText>
            <AppText variant="display">
              {precondition ? 'Could not finish connection' : 'Integration ready'}
            </AppText>
            <AppText tone="muted" variant="body">
              {message || (added ? `${added} is connected.` : 'Your channel list has been refreshed.')}
            </AppText>
          </View>

          <View style={styles.actions}>
            <Button label="Manage channels" onPress={() => router.replace('/integrations' as Href)} />
            <Button
              label="Compose a post"
              onPress={() => router.replace('/(tabs)/compose')}
              variant="secondary"
            />
          </View>
        </Card>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm + 2,
  },
  copy: {
    gap: spacing.sm,
  },
});
