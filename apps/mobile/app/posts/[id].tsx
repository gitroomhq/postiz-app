import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Image, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ApiError } from '@/src/api/client';
import {
  deletePostGroup,
  findFreeSlot,
  getPostDetail,
  updatePostDate,
} from '@/src/api/posts.api';
import type { CreatePostMedia, PostListItem, PostState } from '@/src/api/posts.api';
import { queryClient } from '@/src/providers/query-client';
import { toBackendDate } from '@/src/services/composer.service';
import { getPlatformIconUrl } from '@/src/services/integrations.service';
import { defaultComposerDate, useComposerStore } from '@/src/stores/composer.store';
import { formatContentPreview } from '@/src/utils/content-preview';
import { makeId } from '@/src/utils/make-id';
import {
  AppSheet,
  AppText,
  Avatar,
  Button,
  Card,
  motion,
  Screen,
  ScreenHeader,
  Skeleton,
  spacing,
  StatusBadge,
  Toast,
  useTheme,
} from '@/src/ui';
import type { Tone } from '@/src/ui';

type Feedback = { kind: 'error' | 'success'; message: string };
type BusyAction = 'delete' | 'duplicate' | 'reschedule';

const stateLabels: Record<PostState, string> = {
  DRAFT: 'Draft',
  ERROR: 'Failed',
  PUBLISHED: 'Published',
  QUEUE: 'Scheduled',
};

const stateTones: Record<PostState, Tone> = {
  DRAFT: 'warning',
  ERROR: 'danger',
  PUBLISHED: 'success',
  QUEUE: 'tint',
};

function formatDate(value?: string) {
  if (!value) {
    return 'No date';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Unable to complete request.';
}

function confirmAsync(title: string, message: string, confirmText: string) {
  if (Platform.OS === 'web') {
    const confirm = (globalThis as { confirm?: (text: string) => boolean }).confirm;

    return Promise.resolve(confirm ? confirm(`${title}\n\n${message}`) : false);
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { onPress: () => resolve(false), style: 'cancel', text: 'Cancel' },
      { onPress: () => resolve(true), style: 'destructive', text: confirmText },
    ]);
  });
}

function normalizeIso(value?: string) {
  if (!value) {
    return defaultComposerDate();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? defaultComposerDate() : date.toISOString();
}

function futureDate(hours: number) {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000);
  date.setSeconds(0, 0);

  return date.toISOString();
}

function tomorrowMorning() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);

  return date.toISOString();
}

function mediaName(media: CreatePostMedia) {
  return media.alt || media.path.split('/').pop() || 'media';
}

function groupContent(parts: PostListItem[]) {
  return parts
    .map((post) => post.content?.trim())
    .filter((content): content is string => !!content)
    .join('\n\n');
}

function groupMedia(parts: PostListItem[]) {
  const seen = new Set<string>();
  const media: CreatePostMedia[] = [];

  parts.forEach((post) => {
    (post.image ?? []).forEach((item) => {
      const key = item.id || item.path;

      if (!key || seen.has(key)) {
        return;
      }

      seen.add(key);
      media.push(item);
    });
  });

  return media;
}

function mimeFromPath(path: string) {
  const lower = path.toLowerCase();

  if (lower.endsWith('.mp4')) {
    return 'video/mp4';
  }

  if (lower.endsWith('.mov')) {
    return 'video/quicktime';
  }

  if (lower.endsWith('.gif')) {
    return 'image/gif';
  }

  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
}

function filterForState(state?: PostState) {
  switch (state) {
    case 'DRAFT':
      return 'draft';
    case 'ERROR':
      return 'failed';
    case 'PUBLISHED':
      return 'published';
    case 'QUEUE':
    default:
      return 'scheduled';
  }
}

export default function PostDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const composer = useComposerStore();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const postQuery = useQuery({
    enabled: !!id,
    queryFn: () => getPostDetail(id),
    queryKey: ['posts', 'detail', id],
  });
  const posts = postQuery.data?.posts ?? [];
  const rootPost = posts[0];
  const failed = rootPost?.state === 'ERROR';
  const channelName =
    rootPost?.integration?.name || rootPost?.integration?.providerIdentifier || 'Channel';
  const platformIcon = getPlatformIconUrl(rootPost?.integration?.providerIdentifier);

  async function refreshPostData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['posts'] }),
      postQuery.refetch(),
    ]);
  }

  async function duplicateToComposer() {
    if (!postQuery.data || !rootPost) {
      return;
    }

    setBusyAction('duplicate');
    setFeedback(null);

    try {
      const slot = await findFreeSlot(postQuery.data.integration).catch(() => ({
        date: defaultComposerDate(),
      }));
      const media = groupMedia(posts).filter((item) => item.id && item.path);

      composer.reset();
      composer.setContent(groupContent(posts) || rootPost.content || '');
      composer.setDate(normalizeIso(slot.date));

      if (postQuery.data.integration) {
        composer.toggleIntegration(postQuery.data.integration);
      }

      if (postQuery.data.integration && postQuery.data.settings) {
        composer.setChannelSettings(postQuery.data.integration, postQuery.data.settings);
      }

      media.forEach((item) => {
        composer.addMedia({
          localId: makeId(12),
          mimeType: mimeFromPath(item.path),
          name: mediaName(item),
          path: item.path,
          serverId: item.id,
          status: 'uploaded',
          thumbnail: item.thumbnail,
          uri: item.thumbnail || item.path,
        });
      });

      setFeedback({ kind: 'success', message: 'Post copied into composer.' });
      router.replace('/(tabs)/compose' as Href);
    } catch (error) {
      setFeedback({ kind: 'error', message: getErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function deletePost() {
    const group = postQuery.data?.group ?? rootPost?.group;

    if (!group) {
      setFeedback({ kind: 'error', message: 'This post group could not be found.' });
      return;
    }

    const confirmed = await confirmAsync(
      'Delete post?',
      'This removes the whole post group from the calendar.',
      'Delete'
    );

    if (!confirmed) {
      return;
    }

    setBusyAction('delete');
    setFeedback(null);

    try {
      await deletePostGroup(group);
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      setFeedback({ kind: 'success', message: 'Post deleted.' });
      router.replace({
        pathname: '/(tabs)/calendar',
        params: { filter: filterForState(rootPost?.state) },
      });
    } catch (error) {
      setFeedback({ kind: 'error', message: getErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function rescheduleTo(isoDate: string) {
    if (!rootPost) {
      return;
    }

    setBusyAction('reschedule');
    setFeedback(null);

    try {
      await updatePostDate(rootPost.id, {
        action: rootPost.state === 'PUBLISHED' ? 'update' : 'schedule',
        date: toBackendDate(isoDate),
      });
      setScheduleSheetOpen(false);
      setFeedback({ kind: 'success', message: 'Calendar date updated.' });
      await refreshPostData();
    } catch (error) {
      setFeedback({ kind: 'error', message: getErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function rescheduleToFirstFreeSlot() {
    setBusyAction('reschedule');
    setFeedback(null);

    try {
      const slot = await findFreeSlot(postQuery.data?.integration);
      await rescheduleTo(normalizeIso(slot.date));
    } catch (error) {
      setFeedback({ kind: 'error', message: getErrorMessage(error) });
      setBusyAction(null);
    }
  }

  function openLiveUrl() {
    if (rootPost?.releaseURL) {
      void Linking.openURL(rootPost.releaseURL).catch(() => {
        setFeedback({ kind: 'error', message: 'Unable to open the published post.' });
      });
    }
  }

  return (
    <Screen inset>
      <Animated.View entering={FadeInDown.duration(motion.duration.normal)} style={styles.stack}>
        <ScreenHeader
          kicker="Post detail"
          right={
            rootPost?.state ? (
              <StatusBadge label={stateLabels[rootPost.state]} tone={stateTones[rootPost.state]} />
            ) : undefined
          }
          subtitle={formatContentPreview(rootPost?.content)}
          title="Scheduled post"
        />

        {postQuery.isLoading ? (
          <Card gap={spacing.md}>
            <Skeleton height={16} width="52%" />
            <Skeleton height={14} width="72%" />
            <Skeleton height={14} width="40%" />
          </Card>
        ) : (
          <>
            <Card gap={spacing.md}>
              <View style={styles.channelHeader}>
                <View style={styles.avatarWrap}>
                  <Avatar name={channelName} uri={rootPost?.integration?.picture} />
                  {platformIcon ? (
                    <Image
                      source={{ uri: platformIcon }}
                      style={[styles.platformIcon, { borderColor: colors.surface }]}
                    />
                  ) : null}
                </View>
                <View style={styles.channelCopy}>
                  <AppText numberOfLines={1} variant="bodyStrong">
                    {channelName}
                  </AppText>
                  <AppText numberOfLines={1} tone="muted" variant="footnote">
                    {postQuery.data?.group || rootPost?.group || 'Post group'}
                  </AppText>
                </View>
              </View>
              <DetailRow label="Status">
                {rootPost?.state ? (
                  <StatusBadge label={stateLabels[rootPost.state]} tone={stateTones[rootPost.state]} />
                ) : (
                  <AppText variant="bodyStrong">Unknown</AppText>
                )}
              </DetailRow>
              <DetailRow label="Publish time">
                <AppText variant="bodyStrong">{formatDate(rootPost?.publishDate)}</AppText>
              </DetailRow>
              <DetailRow label="Channel">
                <AppText numberOfLines={1} variant="bodyStrong">
                  {channelName}
                </AppText>
              </DetailRow>
              {rootPost?.releaseId === 'missing' ? (
                <DetailRow label="Release">
                  <StatusBadge label="Needs link" tone="warning" />
                </DetailRow>
              ) : null}
            </Card>

            <Card gap={spacing.md}>
              <View style={styles.actionGrid}>
                <Button
                  flex
                  label="Duplicate"
                  loading={busyAction === 'duplicate'}
                  onPress={duplicateToComposer}
                  variant="soft"
                />
                <Button
                  flex
                  label="Reschedule"
                  onPress={() => setScheduleSheetOpen(true)}
                  variant="secondary"
                />
              </View>
              <View style={styles.actionGrid}>
                {rootPost?.releaseURL ? (
                  <Button flex label="Open live post" onPress={openLiveUrl} variant="secondary" />
                ) : null}
                <Button
                  flex
                  label="Delete"
                  loading={busyAction === 'delete'}
                  onPress={deletePost}
                  variant="danger"
                />
              </View>
            </Card>

            {failed ? (
              <Card gap={spacing.sm} tone="danger">
                <AppText variant="heading">Recovery</AppText>
                <AppText tone="muted" variant="caption">
                  {rootPost?.error || 'Reconnect the channel, then retry from the post tools.'}
                </AppText>
                <Button
                  label="Open integrations"
                  onPress={() => router.push('/integrations' as Href)}
                  size="sm"
                  variant="danger"
                />
              </Card>
            ) : null}

            {rootPost?.releaseId === 'missing' ? (
              <Card gap={spacing.sm} tone="warning">
                <AppText variant="heading">Missing release link</AppText>
                <AppText tone="muted" variant="caption">
                  This published post needs to be matched with the provider URL before statistics can load.
                </AppText>
              </Card>
            ) : null}

            <View style={styles.thread}>
              {posts.map((post, index) => (
                <PostPartCard index={index} key={post.id} post={post} />
              ))}
            </View>
          </>
        )}
      </Animated.View>

      <AppSheet
        isPresented={scheduleSheetOpen}
        onDismiss={() => setScheduleSheetOpen(false)}
        subtitle={
          rootPost?.state === 'PUBLISHED'
            ? 'Published posts are moved without creating a new publish workflow.'
            : 'Queued and draft posts are scheduled again.'
        }
        title="Move calendar date">
        <View style={styles.sheetActions}>
          <Button
            disabled={busyAction === 'reschedule'}
            label="First free slot"
            loading={busyAction === 'reschedule'}
            onPress={rescheduleToFirstFreeSlot}
            variant="primary"
          />
          <Button
            disabled={busyAction === 'reschedule'}
            label="In 1 hour"
            onPress={() => rescheduleTo(futureDate(1))}
            variant="secondary"
          />
          <Button
            disabled={busyAction === 'reschedule'}
            label="Tomorrow 9:00"
            onPress={() => rescheduleTo(tomorrowMorning())}
            variant="secondary"
          />
        </View>
      </AppSheet>

      <Toast kind={feedback?.kind ?? 'info'} message={feedback?.message} />
    </Screen>
  );
}

function PostPartCard({ index, post }: { index: number; post: PostListItem }) {
  const media = post.image ?? [];

  return (
    <Card gap={spacing.sm}>
      <AppText tone="muted" variant="label">
        Part {index + 1}
      </AppText>
      <AppText tone="soft" variant="body">
        {formatContentPreview(post.content)}
      </AppText>

      {media.length ? (
        <ScrollView contentContainerStyle={styles.mediaRow} horizontal showsHorizontalScrollIndicator={false}>
          {media.map((item) => (
            <View key={item.id || item.path} style={styles.mediaTile}>
              <Image
                accessibilityLabel={mediaName(item)}
                source={{ uri: item.thumbnail || item.path }}
                style={styles.mediaImage}
              />
              <AppText numberOfLines={1} tone="muted" variant="footnote">
                {mediaName(item)}
              </AppText>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </Card>
  );
}

function DetailRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View style={styles.row}>
      <AppText tone="muted" variant="label">
        {label}
      </AppText>
      <View style={styles.rowValue}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  avatarWrap: {
    position: 'relative',
  },
  channelCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  channelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  mediaImage: {
    backgroundColor: '#111111',
    borderCurve: 'continuous',
    borderRadius: 12,
    height: 82,
    width: 82,
  },
  mediaRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  mediaTile: {
    gap: spacing.xs,
    width: 82,
  },
  platformIcon: {
    borderRadius: 999,
    borderWidth: 1,
    bottom: -2,
    height: 16,
    position: 'absolute',
    right: -2,
    width: 16,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  rowValue: {
    alignItems: 'flex-end',
    flex: 1,
  },
  sheetActions: {
    gap: spacing.md,
  },
  stack: {
    gap: spacing.lg,
  },
  thread: {
    gap: spacing.md,
  },
});
