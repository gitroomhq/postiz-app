import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';

import { getIntegrations } from '@/src/api/integrations.api';
import { useAuthStore } from '@/src/stores/auth.store';
import {
  AppSheet,
  AppText,
  Avatar,
  Button,
  Card,
  ListRow,
  motion,
  PostizLogo,
  Screen,
  ScreenHeader,
  spacing,
  StatusBadge,
  useTheme,
} from '@/src/ui';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const organization = useAuthStore((state) => state.organization);
  const organizations = useAuthStore((state) => state.organizations);
  const logout = useAuthStore((state) => state.logout);
  const setOrganization = useAuthStore((state) => state.setOrganization);
  const [orgSheetOpen, setOrgSheetOpen] = useState(false);
  const integrationsQuery = useQuery({
    queryFn: getIntegrations,
    queryKey: ['integrations', 'list'],
  });
  const integrations = integrationsQuery.data?.integrations ?? [];
  const attentionCount = integrations.filter(
    (integration) => integration.refreshNeeded || integration.inBetweenSteps
  ).length;

  return (
    <Screen inset>
      <Animated.View entering={FadeInDown.duration(motion.duration.normal)} style={styles.stack}>
        <ScreenHeader kicker="Account" subtitle={user?.email ?? 'Signed in'} title="Settings" />

        <Card gap={spacing.lg} padding="lg">
          <View style={styles.brandRow}>
            <PostizLogo size={58} />
            <View style={styles.brandCopy}>
              <AppText variant="heading">Postiz Mobile</AppText>
              <AppText tone="muted" variant="caption">
                Native schedule checks, channel recovery, and phone-media publishing.
              </AppText>
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <AppText tone="muted" variant="label">
            Workspace
          </AppText>
          <Card padding="none">
            <ListRow
              divider
              leading={<Avatar name={organization?.name ?? 'Workspace'} />}
              onPress={() => setOrgSheetOpen(true)}
              subtitle={
                organizations.length > 1
                  ? `Switch between ${organizations.length} organizations`
                  : 'Current organization'
              }
              title={organization?.name ?? 'Workspace'}
              trailing={<AppText tone="tint" variant="captionStrong">Switch</AppText>}
            />
            <ListRow
              onPress={() => router.push('/integrations' as Href)}
              subtitle={
                integrationsQuery.isLoading
                  ? 'Loading channels'
                  : attentionCount
                  ? `${attentionCount} channel${attentionCount === 1 ? '' : 's'} need attention`
                  : `${integrations.length} connected channel${integrations.length === 1 ? '' : 's'}`
              }
              subtitleTone={attentionCount ? 'danger' : 'muted'}
              title="Channels"
              trailing={
                attentionCount ? (
                  <StatusBadge label={String(attentionCount)} tone="danger" />
                ) : (
                  <AppText tone="tint" variant="captionStrong">Manage</AppText>
                )
              }
            />
          </Card>
        </View>

        <View style={styles.section}>
          <AppText tone="muted" variant="label">
            Support
          </AppText>
          <Card padding="none">
            <ListRow
              onPress={() => router.push('/help' as Href)}
              subtitle="Docs, web app access, and account policies"
              title="Help & support"
              trailing={<AppText tone="tint" variant="captionStrong">Open</AppText>}
            />
          </Card>
        </View>

        <Button label="Log out" onPress={logout} variant="secondary" />
      </Animated.View>

      <AppSheet
        isPresented={orgSheetOpen}
        onDismiss={() => setOrgSheetOpen(false)}
        subtitle="Cached data reloads for the selected organization."
        title="Switch workspace">
        <Card padding="none">
          {organizations.map((org, index) => {
            const selected = org.id === organization?.id;

            return (
              <ListRow
                divider={index < organizations.length - 1}
                key={org.id}
                leading={<Avatar name={org.name} />}
                onPress={() => {
                  setOrgSheetOpen(false);
                  void setOrganization(org);
                }}
                selected={selected}
                subtitle={selected ? 'Current workspace' : 'Switch workspace'}
                subtitleTone={selected ? 'tint' : 'muted'}
                title={org.name}
                trailing={
                  <View
                    style={[
                      styles.radio,
                      {
                        backgroundColor: selected ? colors.tint : 'transparent',
                        borderColor: selected ? colors.tint : colors.borderStrong,
                      },
                    ]}
                  />
                }
              />
            );
          })}
        </Card>
      </AppSheet>
    </Screen>
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
  radio: {
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    width: 18,
  },
  section: {
    gap: spacing.sm,
  },
  stack: {
    gap: spacing.xl,
  },
});
