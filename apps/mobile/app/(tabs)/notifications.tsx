import { FlatList, Linking, RefreshControl, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { getNotifications } from '@/src/api/notifications.api';
import type { NotificationItem } from '@/src/api/notifications.api';
import {
  AppText,
  Card,
  EmptyState,
  motion,
  Screen,
  ScreenHeader,
  Skeleton,
  spacing,
  StatusBadge,
  useTheme,
} from '@/src/ui';
import type { Tone } from '@/src/ui';

type LinkedTextPart = { kind: 'link'; text: string; url: string } | { kind: 'text'; text: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function classifyAlert(content: string): { label: string; tone: Tone } {
  const normalized = content.toLowerCase();

  if (normalized.includes('failed') || normalized.includes('error') || normalized.includes('reconnect')) {
    return { label: 'Recovery', tone: 'danger' };
  }

  if (normalized.includes('approval') || normalized.includes('approve') || normalized.includes('declined')) {
    return { label: 'Approval', tone: 'warning' };
  }

  if (normalized.includes('published') || normalized.includes('scheduled')) {
    return { label: 'Scheduled', tone: 'success' };
  }

  return { label: 'Update', tone: 'info' };
}

function splitLinkedText(content: string): LinkedTextPart[] {
  const regex = /(https?:\/\/[^\s]+)/g;
  const parts: LinkedTextPart[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content))) {
    const raw = match[0];
    const url = raw.replace(/[),.;!?]+$/, '');
    const suffix = raw.slice(url.length);

    if (match.index > cursor) {
      parts.push({ kind: 'text', text: content.slice(cursor, match.index) });
    }

    parts.push({ kind: 'link', text: url, url });

    if (suffix) {
      parts.push({ kind: 'text', text: suffix });
    }

    cursor = match.index + raw.length;
  }

  if (cursor < content.length) {
    parts.push({ kind: 'text', text: content.slice(cursor) });
  }

  return parts.length ? parts : [{ kind: 'text', text: content }];
}

function openLink(url: string) {
  void Linking.openURL(url).catch(() => {});
}

export default function NotificationsScreen() {
  const notificationsQuery = useQuery({
    queryFn: getNotifications,
    queryKey: ['notifications', 'list'],
  });
  const notifications = notificationsQuery.data?.notifications ?? [];
  const actionCount = notifications.filter((item) => {
    const tone = classifyAlert(item.content).tone;

    return tone === 'danger' || tone === 'warning';
  }).length;

  return (
    <Screen inset variant="fixed">
      <ScreenHeader
        kicker="Alerts"
        subtitle={
          notificationsQuery.isLoading
            ? 'Checking for updates'
            : actionCount
            ? `${actionCount} alert${actionCount === 1 ? '' : 's'} need action`
            : 'You are all caught up'
        }
        title="Notifications"
      />

      <FlatList
        contentContainerStyle={styles.listContent}
        data={notificationsQuery.isLoading ? undefined : notifications}
        keyExtractor={(item, index) => `${item.createdAt}-${index}`}
        ListEmptyComponent={
          notificationsQuery.isLoading ? (
            <View style={styles.skeletonStack}>
              {[0, 1, 2].map((item) => (
                <Card gap={spacing.md} key={item}>
                  <Skeleton height={16} width="42%" />
                  <Skeleton height={14} width="88%" />
                  <Skeleton height={14} width="64%" />
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState
              body="Failed posts, approval changes, and account updates appear here."
              title="No alerts"
            />
          )
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => notificationsQuery.refetch()}
            refreshing={notificationsQuery.isRefetching}
          />
        }
        renderItem={({ index, item }) => <NotificationCard index={index} item={item} />}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function NotificationCard({ index, item }: { index: number; item: NotificationItem }) {
  const { colors } = useTheme();
  const classification = classifyAlert(item.content);
  const parts = splitLinkedText(item.content);

  return (
    <Animated.View
      entering={FadeInDown.delay(motion.stagger(index)).duration(motion.duration.normal)}>
      <Card gap={spacing.sm + 2}>
        <View style={styles.cardHeader}>
          <StatusBadge label={classification.label} tone={classification.tone} />
          <AppText tone="muted" variant="footnote">
            {formatDate(item.createdAt)}
          </AppText>
        </View>
        <AppText variant="body">
          {parts.map((part, partIndex) =>
            part.kind === 'link' ? (
              <AppText
                key={`${part.text}-${partIndex}`}
                onPress={() => openLink(part.url)}
                style={{ color: colors.tint, textDecorationLine: 'underline' }}
                variant="body">
                {part.text}
              </AppText>
            ) : (
              <AppText key={`text-${partIndex}`} variant="body">
                {part.text}
              </AppText>
            )
          )}
        </AppText>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  skeletonStack: {
    gap: spacing.md,
  },
});
