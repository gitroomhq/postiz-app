import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { getPostList } from '@/src/api/posts.api';
import type { PostListFilter, PostListItem, PostState } from '@/src/api/posts.api';
import { getPlatformIconUrl } from '@/src/services/integrations.service';
import { useAuthStore } from '@/src/stores/auth.store';
import { formatContentPreview } from '@/src/utils/content-preview';
import {
  AppText,
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  motion,
  radius,
  ScalePressable,
  Screen,
  ScreenHeader,
  Skeleton,
  spacing,
  StatusBadge,
  useTheme,
} from '@/src/ui';
import type { Tone } from '@/src/ui';

const POST_PAGE_SIZE = 25;

const filters: Array<{ label: string; value: PostListFilter }> = [
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Failed', value: 'failed' },
  { label: 'Drafts', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'All', value: 'all' },
];

const stateLabels: Record<PostState, string> = {
  DRAFT: 'Draft',
  ERROR: 'Failed',
  PUBLISHED: 'Live',
  QUEUE: 'Scheduled',
};

const stateTones: Record<PostState, Tone> = {
  DRAFT: 'warning',
  ERROR: 'danger',
  PUBLISHED: 'success',
  QUEUE: 'tint',
};

type CalendarRow =
  | { count: number; id: string; label: string; type: 'date' }
  | { id: string; post: PostListItem; type: 'post' };

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(
    new Date(value)
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(value)
  );
}

function channelName(item: PostListItem) {
  return item.integration?.name || item.integration?.providerIdentifier || 'Channel';
}

function dayLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  }).format(new Date(value));
}

function buildCalendarRows(posts: PostListItem[] = []): CalendarRow[] {
  const counts = new Map<string, number>();

  posts.forEach((post) => {
    const label = dayLabel(post.publishDate);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  const rows: CalendarRow[] = [];
  let currentLabel: string | null = null;

  posts.forEach((post) => {
    const label = dayLabel(post.publishDate);

    if (label !== currentLabel) {
      currentLabel = label;
      rows.push({
        count: counts.get(label) ?? 0,
        id: `date-${label}`,
        label,
        type: 'date',
      });
    }

    rows.push({ id: post.id, post, type: 'post' });
  });

  return rows;
}

function mergePostPages(current: PostListItem[] = [], next: PostListItem[] = []) {
  const seen = new Set(current.map((post) => post.id));

  return [...current, ...next.filter((post) => !seen.has(post.id))];
}

function buildDayRail(posts: PostListItem[]) {
  const today = new Date();

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() + index);
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    const count = posts.filter((post) => {
      const publishDate = new Date(post.publishDate).getTime();

      return publishDate >= date.getTime() && publishDate < next.getTime();
    }).length;

    return {
      count,
      day: new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(date),
      label:
        index === 0
          ? 'Today'
          : new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date),
    };
  });
}

export default function CalendarScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: PostListFilter }>();
  const organization = useAuthStore((state) => state.organization);
  const [filter, setFilter] = useState<PostListFilter>('scheduled');
  const [page, setPage] = useState(0);
  const [loadedPosts, setLoadedPosts] = useState<PostListItem[]>([]);
  const [pageMeta, setPageMeta] = useState({ hasMore: false, total: 0 });
  const postsQuery = useQuery({
    queryFn: () => getPostList(filter, page, POST_PAGE_SIZE),
    queryKey: ['posts', 'list', filter, page],
  });

  useEffect(() => {
    if (params.filter && filters.some((item) => item.value === params.filter)) {
      setFilter(params.filter);
    }
  }, [params.filter]);

  useEffect(() => {
    setPage(0);
    setLoadedPosts([]);
    setPageMeta({ hasMore: false, total: 0 });
  }, [filter]);

  useEffect(() => {
    if (!postsQuery.data) {
      return;
    }

    const nextPosts = Array.isArray(postsQuery.data.posts) ? postsQuery.data.posts : [];

    setLoadedPosts((current) => (page === 0 ? nextPosts : mergePostPages(current, nextPosts)));
    setPageMeta({ hasMore: postsQuery.data.hasMore, total: postsQuery.data.total });
  }, [page, postsQuery.data]);

  const posts = loadedPosts;
  const listRows = useMemo(() => buildCalendarRows(posts), [posts]);
  const initialLoading = postsQuery.isLoading && !posts.length;
  const dayRail = buildDayRail(posts);
  const failedCount = posts.filter((post) => post.state === 'ERROR').length;
  const liveCount = posts.filter((post) => post.state === 'PUBLISHED').length;
  const channelCount = new Set(posts.map((post) => channelName(post))).size;

  function updateFilter(nextFilter: PostListFilter) {
    if (nextFilter !== filter) {
      setFilter(nextFilter);
    }
  }

  function refreshPosts() {
    if (page === 0) {
      void postsQuery.refetch();
      return;
    }

    setPage(0);
  }

  return (
    <Screen inset variant="fixed">
      <Animated.View entering={FadeIn.duration(motion.duration.normal)} style={styles.stack}>
        <ScreenHeader
          kicker={organization?.name ?? 'Workspace'}
          right={
            <IconButton
              accessibilityLabel="Open notifications"
              name={{ android: 'notifications', ios: 'bell.badge', web: 'notifications' }}
              onPress={() => router.push('/(tabs)/notifications')}
              tint={failedCount ? colors.danger : colors.text}
            />
          }
          subtitle={pageMeta.total ? `${pageMeta.total} posts in view` : 'Loading schedule'}
          title="Calendar"
        />

        <Card
          accessibilityLabel="Create post"
          onPress={() => router.push('/(tabs)/compose')}
          padding="sm"
          style={styles.createRow}>
          <View style={[styles.createIcon, { backgroundColor: colors.tint }]}>
            <SymbolView
              name={{ android: 'edit', ios: 'square.and.pencil', web: 'edit' }}
              size={20}
              tintColor="#ffffff"
            />
          </View>
          <View style={styles.createCopy}>
            <AppText variant="heading">Create post</AppText>
            <AppText numberOfLines={1} tone="muted" variant="footnote">
              Pick channels, attach media, schedule
            </AppText>
          </View>
          <SymbolView
            name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }}
            size={16}
            tintColor={colors.mutedText}
          />
        </Card>

        <Card padding="sm" style={styles.statsRow}>
          <Stat label="Today" value={dayRail[0]?.count ?? 0} />
          <StatDivider />
          <Stat label="Channels" value={channelCount} />
          <StatDivider />
          <Stat label="Live" tone="success" value={liveCount} />
          <StatDivider />
          <Stat label="Failed" tone={failedCount ? 'danger' : undefined} value={failedCount} />
        </Card>

        <View style={styles.filtersBand}>
          <ScrollView
            contentContainerStyle={styles.filtersContent}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroller}>
            {filters.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                onPress={() => updateFilter(item.value)}
                selected={item.value === filter}
              />
            ))}
          </ScrollView>
        </View>

        <Card padding="sm" style={styles.dayRail}>
          {dayRail.map((item) => (
            <View key={`${item.label}-${item.day}`} style={styles.dayCell}>
              <AppText tone="muted" variant="footnote">
                {item.label}
              </AppText>
              <View
                style={[
                  styles.dayNumber,
                  { backgroundColor: item.count ? colors.tint : colors.surfaceMuted },
                ]}>
                <AppText
                  style={{ color: item.count ? '#ffffff' : colors.textSoft }}
                  variant="captionStrong">
                  {item.day}
                </AppText>
              </View>
              <AppText tone={item.count ? 'tint' : 'muted'} variant="footnote">
                {item.count ? `${item.count}` : '.'}
              </AppText>
            </View>
          ))}
        </Card>

        <FlatList
          contentContainerStyle={styles.listContent}
          data={initialLoading ? undefined : listRows}
          keyExtractor={(item) => item.id}
          ListFooterComponent={
            pageMeta.hasMore ? (
              <View style={styles.footer}>
                <Button
                  label="Load more"
                  loading={postsQuery.isFetching && page > 0}
                  onPress={() => setPage((value) => value + 1)}
                  variant="secondary"
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            initialLoading ? (
              <View style={styles.skeletonStack}>
                {[0, 1, 2].map((item) => (
                  <Card gap={spacing.md} key={item}>
                    <View style={styles.skeletonRow}>
                      <Skeleton height={36} radius={10} width={36} />
                      <View style={styles.skeletonCopy}>
                        <Skeleton height={14} width="46%" />
                        <Skeleton height={11} width="30%" />
                      </View>
                    </View>
                    <Skeleton height={15} width="88%" />
                  </Card>
                ))}
              </View>
            ) : (
              <EmptyState body="Try another status filter or create a post." title="No posts here" />
            )
          }
          refreshControl={
            <RefreshControl
              onRefresh={refreshPosts}
              refreshing={postsQuery.isRefetching && page === 0}
            />
          }
          renderItem={({ index, item }) =>
            item.type === 'date' ? (
              <DateHeader count={item.count} label={item.label} />
            ) : (
              <PostRow
                index={index}
                item={item.post}
                onPress={() => router.push({ pathname: '/posts/[id]', params: { id: item.post.id } })}
              />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </Screen>
  );
}

function Stat({ label, tone, value }: { label: string; tone?: Tone; value: number }) {
  return (
    <View style={styles.stat}>
      <AppText tone={tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : 'default'} variant="title">
        {value}
      </AppText>
      <AppText tone="muted" variant="footnote">
        {label}
      </AppText>
    </View>
  );
}

function StatDivider() {
  const { colors } = useTheme();

  return <View style={[styles.statDivider, { backgroundColor: colors.border }]} />;
}

function DateHeader({ count, label }: { count: number; label: string }) {
  return (
    <View style={styles.dateHeader}>
      <AppText variant="heading">{label}</AppText>
      <AppText tone="muted" variant="footnote">
        {count} {count === 1 ? 'post' : 'posts'}
      </AppText>
    </View>
  );
}

function PostRow({
  index,
  item,
  onPress,
}: {
  index: number;
  item: PostListItem;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const failed = item.state === 'ERROR';
  const platformIcon = getPlatformIconUrl(item.integration?.providerIdentifier);
  const tags = item.tags?.slice(0, 2) ?? [];
  const extraTagCount = Math.max((item.tags?.length ?? 0) - tags.length, 0);

  return (
    <Animated.View
      entering={FadeInDown.delay(motion.stagger(index)).duration(motion.duration.normal)}>
      <ScalePressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.postCard,
          {
            backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
            borderColor: failed ? colors.danger : colors.border,
          },
        ]}>
        <View style={styles.postHeader}>
          <View style={styles.avatarWrap}>
            <Avatar name={channelName(item)} uri={item.integration?.picture} />
            {platformIcon ? (
              <Image source={{ uri: platformIcon }} style={[styles.platformIcon, { borderColor: colors.surface }]} />
            ) : null}
          </View>
          <View style={styles.postChannel}>
            <AppText numberOfLines={1} variant="bodyStrong">
              {channelName(item)}
            </AppText>
            <AppText numberOfLines={1} tone="muted" variant="footnote">
              {formatTime(item.publishDate)} · {formatDate(item.publishDate)}
            </AppText>
          </View>
          <StatusBadge label={stateLabels[item.state]} tone={stateTones[item.state]} />
        </View>

        {tags.length ? (
          <View style={styles.tagRow}>
            {tags.map(({ tag }) => (
              <View
                key={tag.id}
                style={[
                  styles.tagPill,
                  {
                    backgroundColor: tag.color ? `${tag.color}22` : colors.surfaceMuted,
                    borderColor: tag.color ?? colors.border,
                  },
                ]}>
                <AppText numberOfLines={1} style={tag.color ? { color: tag.color } : undefined} variant="footnote">
                  {tag.name}
                </AppText>
              </View>
            ))}
            {extraTagCount ? (
              <AppText tone="muted" variant="footnote">
                +{extraTagCount}
              </AppText>
            ) : null}
          </View>
        ) : null}

        <AppText numberOfLines={2} tone="soft" variant="body">
          {formatContentPreview(item.content)}
        </AppText>

        <View style={styles.postMeta}>
          {item.intervalInDays ? <StatusBadge label={`Repeats ${item.intervalInDays}d`} /> : null}
          {item.releaseId === 'missing' ? <StatusBadge label="Needs release link" tone="warning" /> : null}
          {item.releaseURL ? <StatusBadge label="Live link" tone="success" /> : null}
          {item.creationMethod && item.creationMethod !== 'UNKNOWN' ? (
            <StatusBadge label={item.creationMethod.toLowerCase()} />
          ) : null}
        </View>

        {failed ? (
          <View style={[styles.recoveryRow, { backgroundColor: colors.dangerSoft }]}>
            <AppText tone="danger" variant="captionStrong">
              Open failure details
            </AppText>
          </View>
        ) : null}
      </ScalePressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    position: 'relative',
  },
  createCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  createIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  createRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  dayCell: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  dayNumber: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  dayRail: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  filtersBand: {
    justifyContent: 'center',
    minHeight: 48,
    zIndex: 1,
  },
  filtersScroller: {
    flexGrow: 0,
  },
  filtersContent: {
    gap: spacing.sm,
    paddingHorizontal: 1,
    paddingVertical: spacing.xs,
  },
  dateHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  footer: {
    paddingBottom: spacing.xl,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  platformIcon: {
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: -2,
    height: 16,
    position: 'absolute',
    right: -2,
    width: 16,
  },
  postCard: {
    borderCurve: 'continuous',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm + 2,
    padding: spacing.lg,
  },
  postChannel: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  postHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  postMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  recoveryRow: {
    borderCurve: 'continuous',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm - 2,
  },
  skeletonCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  skeletonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  skeletonStack: {
    gap: spacing.md,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    gap: 1,
  },
  statDivider: {
    alignSelf: 'center',
    height: 26,
    width: StyleSheet.hairlineWidth,
  },
  statsRow: {
    flexDirection: 'row',
  },
  stack: {
    flex: 1,
    gap: spacing.lg,
  },
  tagPill: {
    borderCurve: 'continuous',
    borderRadius: radius.sm,
    borderWidth: 1,
    maxWidth: 150,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  tagRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
