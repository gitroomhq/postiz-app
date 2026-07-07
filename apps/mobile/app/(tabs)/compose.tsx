import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { getIntegrationFunction, getIntegrations } from '@/src/api/integrations.api';
import type { IntegrationListItem } from '@/src/api/integrations.api';
import { getMediaLibrary } from '@/src/api/media.api';
import type { UploadedMedia } from '@/src/api/media.api';
import { createPost, shouldShortlink, validatePosts } from '@/src/api/posts.api';
import type { CreatePostRequest, CreatePostType } from '@/src/api/posts.api';
import { ApiError } from '@/src/api/client';
import { queryClient } from '@/src/providers/query-client';
import {
  buildPostEntries,
  firstValidationError,
  hashPayload,
  toBackendDate,
} from '@/src/services/composer.service';
import { getPlatformIconUrl } from '@/src/services/integrations.service';
import {
  getDefaultProviderSettings,
  getProviderSettingsConfig,
  normalizeProviderOption,
  validateProviderSettings,
} from '@/src/services/provider-settings.service';
import type { ProviderOption, ProviderSettingsField } from '@/src/services/provider-settings.service';
import { pickMediaFromLibrary, uploadAsset } from '@/src/services/upload.service';
import type { LocalAsset } from '@/src/services/upload.service';
import { useAuthStore } from '@/src/stores/auth.store';
import { useComposerStore } from '@/src/stores/composer.store';
import type { ComposerMedia } from '@/src/stores/composer.store';
import { makeId } from '@/src/utils/make-id';
import {
  AppSheet,
  AppText,
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  ListRow,
  motion,
  ScalePressable,
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

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

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
      { onPress: () => resolve(false), style: 'cancel', text: 'No thanks' },
      { onPress: () => resolve(true), text: confirmText },
    ]);
  });
}

function formatScheduleDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(iso));
}

function presetTonight() {
  const date = new Date();
  date.setHours(19, 0, 0, 0);

  if (date.getTime() <= Date.now()) {
    date.setTime(date.getTime() + DAY);
  }

  return date.toISOString();
}

function presetTomorrowMorning() {
  const date = new Date(Date.now() + DAY);
  date.setHours(9, 0, 0, 0);

  return date.toISOString();
}

function readyTone(done: boolean): Tone {
  return done ? 'tint' : 'neutral';
}

function mediaName(media: UploadedMedia) {
  return media.originalName || media.name || media.path.split('/').pop() || 'media';
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

export default function ComposeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const organization = useAuthStore((state) => state.organization);
  const composer = useComposerStore();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState<CreatePostType | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [channelPickerOpen, setChannelPickerOpen] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaPage, setMediaPage] = useState(1);
  const [settingsTargetId, setSettingsTargetId] = useState<string | null>(null);
  const [channelSearch, setChannelSearch] = useState('');
  const assetsRef = useRef<Record<string, LocalAsset>>({});
  const idempotencyRef = useRef<{ hash: string; key: string } | null>(null);
  const integrationsQuery = useQuery({
    queryFn: getIntegrations,
    queryKey: ['integrations', 'list'],
  });
  const mediaLibraryQuery = useQuery({
    enabled: mediaLibraryOpen,
    queryFn: () => getMediaLibrary(mediaPage, mediaSearch.trim() || undefined),
    queryKey: ['media', 'library', mediaPage, mediaSearch],
  });

  const integrations = integrationsQuery.data?.integrations ?? [];
  const filteredIntegrations = useMemo(() => {
    const search = channelSearch.trim().toLowerCase();

    if (!search) {
      return integrations;
    }

    return integrations.filter((integration) =>
      [integration.name, integration.identifier, integration.display]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [channelSearch, integrations]);
  const selectedIntegrations = integrations.filter(
    (integration) =>
      composer.selectedIntegrationIds.includes(integration.id) &&
      !integration.disabled &&
      !integration.refreshNeeded
  );
  const selectedPreview = selectedIntegrations.slice(0, 3);
  const settingsTarget = selectedIntegrations.find((integration) => integration.id === settingsTargetId) ?? null;
  const uploadedMedia = composer.media.filter((item) => item.status === 'uploaded');
  const failedMediaCount = composer.media.filter((item) => item.status === 'failed').length;
  const uploadingMediaCount = composer.media.filter((item) => item.status === 'uploading').length;
  const hasContent = !!composer.content.trim() || !!uploadedMedia.length;
  const scheduleIsFuture = new Date(composer.date).getTime() > Date.now();
  const readyStepCount = [!!selectedIntegrations.length, hasContent, scheduleIsFuture].filter(Boolean).length;

  async function uploadOne(localId: string, asset: LocalAsset) {
    assetsRef.current[localId] = asset;

    try {
      const uploaded = await uploadAsset(asset);

      composer.updateMedia(localId, {
        path: uploaded.path,
        serverId: uploaded.id,
        status: 'uploaded',
        thumbnail: uploaded.thumbnail ?? undefined,
      });
    } catch {
      composer.updateMedia(localId, { status: 'failed' });
    }
  }

  async function handleAddMedia() {
    setFeedback(null);

    try {
      const assets = await pickMediaFromLibrary();

      assets.forEach((asset) => {
        const localId = makeId(12);

        composer.addMedia({
          localId,
          mimeType: asset.mimeType,
          name: asset.name,
          status: 'uploading',
          uri: asset.uri,
        });
        void uploadOne(localId, asset);
      });
    } catch (error) {
      setFeedback({ kind: 'error', message: getErrorMessage(error) });
    }
  }

  function handleRetryMedia(localId: string) {
    const asset = assetsRef.current[localId];

    if (!asset) {
      composer.removeMedia(localId);
      return;
    }

    composer.updateMedia(localId, { status: 'uploading' });
    void uploadOne(localId, asset);
  }

  function handlePickLibraryMedia(media: UploadedMedia) {
    if (composer.media.some((item) => item.serverId === media.id)) {
      setFeedback({ kind: 'error', message: 'That media item is already attached.' });
      return;
    }

    composer.addMedia({
      localId: makeId(12),
      mimeType: mimeFromPath(media.path),
      name: mediaName(media),
      path: media.path,
      serverId: media.id,
      status: 'uploaded',
      thumbnail: media.thumbnail ?? undefined,
      uri: media.thumbnail || media.path,
    });
    setFeedback({ kind: 'success', message: 'Media attached from library.' });
  }

  async function submit(type: CreatePostType) {
    if (submitting) {
      return;
    }

    setFeedback(null);

    if (!selectedIntegrations.length) {
      setFeedback({ kind: 'error', message: 'Select at least one channel.' });
      return;
    }

    if (composer.media.some((item) => item.status === 'uploading')) {
      setFeedback({ kind: 'error', message: 'Wait for media uploads to finish.' });
      return;
    }

    if (composer.media.some((item) => item.status === 'failed')) {
      setFeedback({ kind: 'error', message: 'Retry or remove failed media first.' });
      return;
    }

    if (!composer.content.trim() && !uploadedMedia.length) {
      setFeedback({ kind: 'error', message: 'Add text or media before submitting.' });
      return;
    }

    if (type === 'schedule' && !scheduleIsFuture) {
      setFeedback({ kind: 'error', message: 'Pick a future time to schedule this post.' });
      setScheduleOpen(true);
      return;
    }

    if (type !== 'draft') {
      for (const integration of selectedIntegrations) {
        const settingsError = validateProviderSettings(
          integration.identifier,
          composer.channelSettings[integration.id]
        );

        if (settingsError) {
          setFeedback({ kind: 'error', message: `${integration.name}: ${settingsError}` });
          setSettingsTargetId(integration.id);
          return;
        }
      }
    }

    setSubmitting(type);

    try {
      const entries = buildPostEntries({
        channelOverrides: composer.channelOverrides,
        channelSettings: composer.channelSettings,
        content: composer.content,
        group: makeId(10),
        integrations: selectedIntegrations,
        media: composer.media,
      });

      const validation = await validatePosts(entries);
      const validationError = firstValidationError(validation, type);

      if (validationError) {
        setFeedback({ kind: 'error', message: validationError });
        return;
      }

      let shortLink = false;
      const messages = entries.flatMap((entry) => entry.value.map((value) => value.content));

      if (type !== 'draft' && messages.some((message) => message.includes('http'))) {
        const shortlink = await shouldShortlink(messages).catch(() => ({ ask: false }));

        if (shortlink.ask) {
          shortLink = await confirmAsync(
            'Shorten links?',
            'Shortlinks let you track click statistics.',
            'Shorten links'
          );
        }
      }

      const payload: CreatePostRequest = {
        date: toBackendDate(composer.date),
        posts: entries,
        shortLink,
        tags: [],
        type,
      };
      const payloadHash = hashPayload(payload);

      if (!idempotencyRef.current || idempotencyRef.current.hash !== payloadHash) {
        idempotencyRef.current = { hash: payloadHash, key: makeId(24) };
      }

      await createPost(payload, idempotencyRef.current.key);
      idempotencyRef.current = null;
      assetsRef.current = {};
      composer.reset();
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      setFeedback({
        kind: 'success',
        message:
          type === 'draft'
            ? 'Draft saved.'
            : type === 'now'
            ? 'Post is publishing now.'
            : 'Post scheduled.',
      });
      router.push(
        type === 'draft'
          ? { pathname: '/(tabs)/calendar', params: { filter: 'draft' } }
          : '/(tabs)/calendar'
      );
    } catch (error) {
      setFeedback({ kind: 'error', message: getErrorMessage(error) });
    } finally {
      setSubmitting(null);
    }
  }

  function adjustDate(deltaMs: number) {
    const minimum = Date.now() + 5 * MINUTE;
    const next = Math.max(new Date(composer.date).getTime() + deltaMs, minimum);

    composer.setDate(new Date(next).toISOString());
  }

  return (
    <>
      <Screen inset variant="form">
        <Animated.View entering={FadeInDown.duration(motion.duration.normal)} style={styles.stack}>
        <ScreenHeader
          kicker={organization?.name ?? 'Workspace'}
          subtitle={`${readyStepCount}/3 checks ready`}
          title="Compose"
        />

        <Card gap={spacing.md}>
          <View style={styles.setupHeader}>
            <View style={[styles.setupIcon, { backgroundColor: colors.tintSoft }]}>
              <SymbolView
                name={{ android: 'send', ios: 'paperplane.fill', web: 'send' }}
                size={18}
                tintColor={colors.tint}
              />
            </View>
            <View style={styles.flex}>
              <AppText variant="heading">
                {readyStepCount === 3 ? 'Ready to publish' : 'Finish setup'}
              </AppText>
              <AppText tone="muted" variant="caption">
                Channels, content, and a future schedule are validated before submit.
              </AppText>
            </View>
          </View>
          <View style={styles.setupSteps}>
            <StatusBadge label={`${selectedIntegrations.length} channels`} tone={readyTone(!!selectedIntegrations.length)} />
            <StatusBadge label={hasContent ? 'Content ready' : 'No content'} tone={readyTone(hasContent)} />
            <StatusBadge label={scheduleIsFuture ? 'Future time' : 'Needs time'} tone={readyTone(scheduleIsFuture)} />
          </View>
        </Card>

        <View style={styles.section}>
          <SectionHeading
            meta={
              integrationsQuery.isLoading
                ? 'Loading channels'
                : `${selectedIntegrations.length} of ${integrations.length} selected`
            }
            title="Channels"
          />
          {integrationsQuery.isLoading ? (
            <Card gap={spacing.md}>
              {[0, 1, 2].map((item) => (
                <View key={item} style={styles.skeletonRow}>
                  <Skeleton height={38} radius={10} width={38} />
                  <View style={styles.flex}>
                    <Skeleton height={14} width="46%" />
                    <Skeleton height={12} width="32%" />
                  </View>
                </View>
              ))}
            </Card>
          ) : integrations.length ? (
            <Card gap={spacing.md}>
              <View style={styles.channelSummaryHeader}>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">
                    {selectedIntegrations.length
                      ? `${selectedIntegrations.length} selected`
                      : 'No channels selected'}
                  </AppText>
                  <AppText tone="muted" variant="caption">
                    Search and select channels in a focused drawer.
                  </AppText>
                </View>
                <Button label="Choose" onPress={() => setChannelPickerOpen(true)} size="sm" variant="soft" />
              </View>
              {selectedIntegrations.length ? (
                <ScrollView
                  contentContainerStyle={styles.selectedChannels}
                  horizontal
                  showsHorizontalScrollIndicator={false}>
                  {selectedPreview.map((integration) => (
                    <SelectedChannelPill
                      integration={integration}
                      key={integration.id}
                      onPress={() => setSettingsTargetId(integration.id)}
                    />
                  ))}
                  {selectedIntegrations.length > selectedPreview.length ? (
                    <View style={[styles.selectedPill, { borderColor: colors.border }]}>
                      <AppText tone="muted" variant="captionStrong">
                        +{selectedIntegrations.length - selectedPreview.length} more
                      </AppText>
                    </View>
                  ) : null}
                </ScrollView>
              ) : (
                <View style={[styles.channelEmpty, { backgroundColor: colors.surfaceMuted }]}>
                  <AppText tone="muted" variant="caption">
                    Pick one or more channels before publishing.
                  </AppText>
                </View>
              )}
            </Card>
          ) : (
            <EmptyState
              body="Connect channels from the web app before composing on mobile."
              title="No channels connected"
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionHeading
            meta={`${composer.content.length} characters · ${uploadedMedia.length} media ready`}
            title="Post"
          />
          <Card gap={spacing.md}>
            <Field
              accessibilityLabel="Post content"
              multiline
              onChangeText={composer.setContent}
              placeholder="What do you want to share?"
              value={composer.content}
            />
          </Card>
        </View>

        {selectedIntegrations.length > 1 ? (
          <View style={styles.section}>
            <SectionHeading meta="Optional per-channel copy" title="Channel overrides" />
            {selectedIntegrations.map((integration) => (
              <ChannelOverride
                integration={integration}
                key={integration.id}
                onChange={(value) => composer.setChannelOverride(integration.id, value)}
                onClear={() => composer.clearChannelOverride(integration.id)}
                value={composer.channelOverrides[integration.id]}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeading
            action={
              <View style={styles.mediaHeaderActions}>
                <Button label="Library" onPress={() => setMediaLibraryOpen(true)} size="sm" variant="secondary" />
                <Button label="Upload" onPress={handleAddMedia} size="sm" variant="soft" />
              </View>
            }
            meta={
              uploadingMediaCount
                ? `${uploadingMediaCount} uploading`
                : failedMediaCount
                ? `${failedMediaCount} need retry`
                : `${composer.media.length} attached`
            }
            title="Media"
          />
          {composer.media.length ? (
            <ScrollView contentContainerStyle={styles.mediaRow} horizontal showsHorizontalScrollIndicator={false}>
              {composer.media.map((item) => (
                <Card
                  gap={spacing.sm}
                  key={item.localId}
                  padding="none"
                  style={styles.mediaCard}
                  tone={item.status === 'failed' ? 'danger' : 'default'}>
                  <View>
                    <Image
                      accessibilityLabel={item.name}
                      source={{ uri: item.path || item.uri }}
                      style={styles.mediaThumb}
                    />
                    {item.status === 'uploading' ? (
                      <View style={styles.mediaOverlay}>
                        <ActivityIndicator color="#ffffff" />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.mediaActions}>
                    {item.status === 'failed' ? (
                      <Button
                        label="Retry"
                        onPress={() => handleRetryMedia(item.localId)}
                        size="sm"
                        variant="soft"
                      />
                    ) : null}
                    <Button
                      label="Remove"
                      onPress={() => composer.removeMedia(item.localId)}
                      size="sm"
                      variant="ghost"
                    />
                  </View>
                </Card>
              ))}
            </ScrollView>
          ) : (
            <Card accessibilityLabel="Add media" onPress={handleAddMedia} padding="lg" style={styles.mediaEmpty}>
              <View style={[styles.mediaEmptyIcon, { backgroundColor: colors.tintSoft }]}>
                <SymbolView
                  name={{ android: 'photo_library', ios: 'photo.stack', web: 'photo_library' }}
                  size={22}
                  tintColor={colors.tint}
                />
              </View>
              <View style={styles.flex}>
                <AppText variant="heading">Add media from device</AppText>
                <AppText tone="muted" variant="caption">
                  Photos and videos upload before scheduling.
                </AppText>
              </View>
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeading meta="Native schedule controls open below" title="Schedule" />
          <Card accessibilityLabel="Change schedule" onPress={() => setScheduleOpen(true)}>
            <View style={styles.scheduleRow}>
              <View style={styles.flex}>
                <AppText tone="muted" variant="label">
                  Selected time
                </AppText>
                <AppText variant="heading">{formatScheduleDate(composer.date)}</AppText>
              </View>
              <StatusBadge label={scheduleIsFuture ? 'Ready' : 'Past'} tone={scheduleIsFuture ? 'tint' : 'danger'} />
            </View>
          </Card>
        </View>

        <View style={styles.actions}>
          <Button
            label="Schedule post"
            loading={submitting === 'schedule'}
            onPress={() => submit('schedule')}
            size="lg"
          />
          <View style={styles.secondaryActions}>
            <Button
              flex
              label="Save draft"
              loading={submitting === 'draft'}
              onPress={() => submit('draft')}
              variant="secondary"
            />
            <Button
              flex
              label="Post now"
              loading={submitting === 'now'}
              onPress={() => submit('now')}
              variant="secondary"
            />
          </View>
        </View>
        </Animated.View>
      </Screen>

      <AppSheet
        isPresented={channelPickerOpen}
        onDismiss={() => setChannelPickerOpen(false)}
        scroll={false}
        subtitle={`${selectedIntegrations.length} of ${integrations.length} selected`}
        title="Choose channels">
        <View style={styles.sheetStack}>
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            label="Search channels"
            onChangeText={setChannelSearch}
            placeholder="Name or provider"
            value={channelSearch}
          />
          <FlatList
            contentContainerStyle={
              filteredIntegrations.length ? styles.channelPickerContent : styles.channelPickerEmpty
            }
            data={filteredIntegrations}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <EmptyState body="Try another channel name or provider." title="No channels found" />
            }
            renderItem={({ item, index }) => (
              <ChannelRow
                divider={index < filteredIntegrations.length - 1}
                integration={item}
                onToggle={() => composer.toggleIntegration(item.id)}
                selected={composer.selectedIntegrationIds.includes(item.id)}
              />
            )}
            showsVerticalScrollIndicator={false}
            style={[styles.channelPickerList, { borderColor: colors.border }]}
          />
          <Button label="Done" onPress={() => setChannelPickerOpen(false)} />
        </View>
      </AppSheet>

      <AppSheet
        isPresented={scheduleOpen}
        onDismiss={() => setScheduleOpen(false)}
        snapPoints={['half']}
        subtitle={formatScheduleDate(composer.date)}
        title="Schedule post">
        <View style={styles.sheetStack}>
          <View style={styles.quickGrid}>
            <Chip label="In 1 hour" onPress={() => composer.setDate(new Date(Date.now() + HOUR).toISOString())} />
            <Chip label="Tonight" onPress={() => composer.setDate(presetTonight())} />
            <Chip label="Tomorrow 9 AM" onPress={() => composer.setDate(presetTomorrowMorning())} />
          </View>
          <View style={styles.quickGrid}>
            <Chip label="-1h" onPress={() => adjustDate(-HOUR)} />
            <Chip label="+15m" onPress={() => adjustDate(15 * MINUTE)} />
            <Chip label="+1h" onPress={() => adjustDate(HOUR)} />
            <Chip label="+1d" onPress={() => adjustDate(DAY)} />
          </View>
          <Button label="Done" onPress={() => setScheduleOpen(false)} />
        </View>
      </AppSheet>

      <AppSheet
        isPresented={mediaLibraryOpen}
        onDismiss={() => setMediaLibraryOpen(false)}
        scroll={false}
        subtitle="Reuse uploaded Postiz media"
        title="Media library">
        <View style={styles.sheetStack}>
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            label="Search media"
            onChangeText={(value) => {
              setMediaSearch(value);
              setMediaPage(1);
            }}
            placeholder="Filename"
            value={mediaSearch}
          />
          <FlatList
            contentContainerStyle={
              mediaLibraryQuery.data?.results?.length ? styles.mediaLibraryContent : styles.channelPickerEmpty
            }
            data={mediaLibraryQuery.data?.results ?? []}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              mediaLibraryQuery.isLoading ? (
                <View style={styles.skeletonStack}>
                  {[0, 1, 2].map((item) => (
                    <Skeleton height={58} key={item} width="100%" />
                  ))}
                </View>
              ) : (
                <EmptyState body="Upload from device or try another search." title="No media found" />
              )
            }
            renderItem={({ item, index }) => (
              <MediaLibraryRow
                divider={index < (mediaLibraryQuery.data?.results.length ?? 0) - 1}
                media={item}
                onPress={() => handlePickLibraryMedia(item)}
                selected={composer.media.some((media) => media.serverId === item.id)}
              />
            )}
            showsVerticalScrollIndicator={false}
            style={[styles.mediaLibraryList, { borderColor: colors.border }]}
          />
          <View style={styles.libraryPager}>
            <Button
              disabled={mediaPage <= 1}
              flex
              label="Previous"
              onPress={() => setMediaPage((page) => Math.max(1, page - 1))}
              variant="secondary"
            />
            <Button
              disabled={mediaPage >= (mediaLibraryQuery.data?.pages ?? 1)}
              flex
              label="Next"
              onPress={() => setMediaPage((page) => page + 1)}
              variant="secondary"
            />
          </View>
          <Button label="Done" onPress={() => setMediaLibraryOpen(false)} />
        </View>
      </AppSheet>

      <ProviderSettingsSheet
        integration={settingsTarget}
        media={uploadedMedia}
        onChange={(key, value) => {
          if (settingsTarget) {
            composer.setChannelSetting(settingsTarget.id, key, value);
          }
        }}
        onDismiss={() => setSettingsTargetId(null)}
        settings={
          settingsTarget
            ? {
                ...getDefaultProviderSettings(settingsTarget.identifier),
                ...(composer.channelSettings[settingsTarget.id] ?? {}),
              }
            : {}
        }
      />

      <Toast kind={feedback?.kind ?? 'info'} message={feedback?.message} />
    </>
  );
}

function SectionHeading({
  action,
  meta,
  title,
}: {
  action?: ReactNode;
  meta?: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.flex}>
        <AppText variant="heading">{title}</AppText>
        {meta ? (
          <AppText tone="muted" variant="caption">
            {meta}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

function ProviderSettingsSheet({
  integration,
  media,
  onChange,
  onDismiss,
  settings,
}: {
  integration: IntegrationListItem | null;
  media: ComposerMedia[];
  onChange: (key: string, value: unknown) => void;
  onDismiss: () => void;
  settings: Record<string, unknown>;
}) {
  const config = getProviderSettingsConfig(integration?.identifier);
  const fields = config.fields.filter((field) => !field.visibleWhen || field.visibleWhen(settings));

  return (
    <AppSheet
      isPresented={!!integration}
      onDismiss={onDismiss}
      subtitle={integration?.name}
      title={config.title}>
      <View style={styles.sheetStack}>
        {fields.length ? (
          fields.map((field) =>
            integration ? (
              <ProviderSettingsFieldInput
                field={field}
                integration={integration}
                key={field.key}
                media={media}
                onChange={(value) => onChange(field.key, value)}
                settings={settings}
              />
            ) : null
          )
        ) : (
          <EmptyState body="This provider does not expose extra composer settings on web." title="No extra settings" />
        )}
        <Button label="Done" onPress={onDismiss} />
      </View>
    </AppSheet>
  );
}

function ProviderSettingsFieldInput({
  field,
  integration,
  media,
  onChange,
  settings,
}: {
  field: ProviderSettingsField;
  integration: IntegrationListItem;
  media: ComposerMedia[];
  onChange: (value: unknown) => void;
  settings: Record<string, unknown>;
}) {
  const { colors } = useTheme();
  const value = settings[field.key];

  if (
    field.type === 'text' ||
    field.type === 'url' ||
    field.type === 'date' ||
    field.type === 'time' ||
    field.type === 'color' ||
    field.type === 'multiline'
  ) {
    return (
      <Field
        autoCapitalize="none"
        autoCorrect={false}
        hint={field.hint}
        inputMode={field.type === 'url' ? 'url' : field.type === 'color' ? 'text' : undefined}
        label={requiredLabel(field)}
        multiline={field.type === 'multiline'}
        onChangeText={onChange}
        placeholder={field.label}
        value={typeof value === 'string' ? value : ''}
      />
    );
  }

  if (field.type === 'boolean') {
    const enabled = value === true;

    return (
      <ListRow
        onPress={() => onChange(!enabled)}
        selected={enabled}
        subtitle={field.hint}
        title={field.label}
        trailing={
          <View
            style={[
              styles.switchTrack,
              {
                backgroundColor: enabled ? colors.tint : colors.surfaceInset,
                borderColor: enabled ? colors.tint : colors.borderStrong,
              },
            ]}>
            <View style={[styles.switchThumb, { backgroundColor: '#ffffff', marginLeft: enabled ? 18 : 2 }]} />
          </View>
        }
      />
    );
  }

  if (field.type === 'select') {
    return (
      <View style={styles.fieldGroup}>
        <AppText tone="muted" variant="label">
          {requiredLabel(field)}
        </AppText>
        <View style={styles.quickGrid}>
          {field.options.map((option) => (
            <Chip
              key={String(option.value)}
              label={option.label}
              onPress={() => onChange(option.value)}
              selected={value === option.value}
            />
          ))}
        </View>
      </View>
    );
  }

  if (field.type === 'asyncSelect' || field.type === 'asyncMulti') {
    return (
      <AsyncProviderOptionField
        field={field}
        integration={integration}
        onChange={onChange}
        settings={settings}
        value={value}
      />
    );
  }

  if (field.type === 'communityList') {
    return <CommunityListField field={field} onChange={onChange} value={value} />;
  }

  if (field.type === 'instagramAudio') {
    return <InstagramAudioField field={field} integration={integration} onChange={onChange} value={value} />;
  }

  if (field.type === 'tagInput') {
    const list = Array.isArray(value) ? (value as ProviderOption[]) : [];

    return (
      <Field
        autoCapitalize="none"
        autoCorrect={false}
        hint={field.maxItems ? `Comma-separated, maximum ${field.maxItems}.` : 'Comma-separated values.'}
        label={requiredLabel(field)}
        onChangeText={(text) =>
          onChange(
            text
              .split(',')
              .map((part) => part.trim())
              .filter(Boolean)
              .slice(0, field.maxItems)
              .map((part) => ({ label: part, value: part }))
          )
        }
        placeholder="tag-one, tag-two"
        value={list.map((item) => item.label ?? item.value).join(', ')}
      />
    );
  }

  if (field.type === 'media') {
    return <MediaSettingsField field={field} media={media} onChange={onChange} value={value} />;
  }

  return null;
}

function AsyncProviderOptionField({
  field,
  integration,
  onChange,
  settings,
  value,
}: {
  field: Extract<ProviderSettingsField, { type: 'asyncSelect' | 'asyncMulti' }>;
  integration: IntegrationListItem;
  onChange: (value: unknown) => void;
  settings: Record<string, unknown>;
  value: unknown;
}) {
  const params = field.params?.(settings) ?? {};
  const enabled = Object.values(params).every((current) => current !== undefined && current !== null && current !== '');
  const optionsQuery = useQuery({
    enabled,
    queryFn: async () => {
      const response = await getIntegrationFunction<unknown[]>(integration.id, field.functionName, params);

      return (response ?? []).map(normalizeProviderOption).filter(Boolean) as ProviderOption[];
    },
    queryKey: ['integrations', 'function', integration.id, field.functionName, params],
  });
  const options = optionsQuery.data ?? [];

  function selectOption(option: ProviderOption) {
    const optionValue = field.valueMode === 'number' ? Number(option.value) : option.value;

    if (field.type === 'asyncSelect') {
      onChange(optionValue);
      return;
    }

    const current = Array.isArray(value) ? value : [];
    const exists = current.some((item) => optionMatchesValue(option, item, field.valueMode));

    if (exists) {
      onChange(current.filter((item) => !optionMatchesValue(option, item, field.valueMode)));
      return;
    }

    onChange(field.valueMode === 'number' ? [...current, optionValue] : [...current, option]);
  }

  return (
    <View style={styles.fieldGroup}>
      <AppText tone="muted" variant="label">
        {requiredLabel(field)}
      </AppText>
      {!enabled ? (
        <AppText tone="muted" variant="caption">
          Select the parent field first.
        </AppText>
      ) : optionsQuery.isLoading ? (
        <View style={styles.skeletonRow}>
          <Skeleton height={34} radius={17} width={120} />
          <Skeleton height={34} radius={17} width={90} />
        </View>
      ) : options.length ? (
        <View style={styles.quickGrid}>
          {options.map((option) => (
            <Chip
              key={String(option.value)}
              label={option.label}
              onPress={() => selectOption(option)}
              selected={
                field.type === 'asyncSelect'
                  ? String(value ?? '') === String(option.value)
                  : Array.isArray(value) && value.some((item) => optionMatchesValue(option, item, field.valueMode))
              }
            />
          ))}
        </View>
      ) : (
        <AppText tone="muted" variant="caption">
          No options returned.
        </AppText>
      )}
    </View>
  );
}

type InstagramAudioResult = {
  artist?: string;
  duration?: number;
  id: string;
  image?: string;
  previewUrl?: string;
  title?: string;
};

type InstagramAudioValue = InstagramAudioResult & {
  audio_volume?: number;
  video_volume?: number;
};

function InstagramAudioField({
  field,
  integration,
  onChange,
  value,
}: {
  field: Extract<ProviderSettingsField, { type: 'instagramAudio' }>;
  integration: IntegrationListItem;
  onChange: (value: unknown) => void;
  value: unknown;
}) {
  const [query, setQuery] = useState('');
  const [audioType, setAudioType] = useState<'music' | 'original_sound'>('music');
  const selected = value && typeof value === 'object' ? (value as InstagramAudioValue) : undefined;
  const audioQuery = useQuery({
    enabled: !selected,
    queryFn: () =>
      getIntegrationFunction<InstagramAudioResult[]>(integration.id, field.functionName, {
        q: query.trim(),
        type: audioType,
      }),
    queryKey: ['integrations', 'function', integration.id, field.functionName, audioType, query.trim()],
  });
  const options = audioQuery.data ?? [];

  function updateVolume(key: 'audio_volume' | 'video_volume', volume: number) {
    if (!selected) {
      return;
    }

    onChange({ ...selected, [key]: volume });
  }

  return (
    <View style={styles.fieldGroup}>
      <View style={styles.sectionHeader}>
        <View style={styles.flex}>
          <AppText tone="muted" variant="label">
            {field.label}
          </AppText>
          {field.hint ? (
            <AppText tone="muted" variant="caption">
              {field.hint}
            </AppText>
          ) : null}
        </View>
        {selected?.id ? <Button label="Remove" onPress={() => onChange(undefined)} size="sm" variant="ghost" /> : null}
      </View>

      {selected?.id ? (
        <Card gap={spacing.md} inset>
          <ListRow
            leading={<Avatar name={selected.title || 'Audio'} size={40} uri={selected.image} />}
            subtitle={selected.artist || selected.id}
            title={selected.title || 'Selected audio'}
          />
          <AudioVolumeControl
            label="Audio volume"
            onChange={(volume) => updateVolume('audio_volume', volume)}
            value={selected.audio_volume ?? 100}
          />
          <AudioVolumeControl
            label="Original video volume"
            onChange={(volume) => updateVolume('video_volume', volume)}
            value={selected.video_volume ?? 100}
          />
        </Card>
      ) : (
        <>
          <View style={styles.quickGrid}>
            <Chip label="Music" onPress={() => setAudioType('music')} selected={audioType === 'music'} />
            <Chip
              label="Original sound"
              onPress={() => setAudioType('original_sound')}
              selected={audioType === 'original_sound'}
            />
          </View>
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            label="Search audio"
            onChangeText={setQuery}
            placeholder="Leave empty for trending"
            value={query}
          />
          {audioQuery.isLoading ? (
            <View style={styles.skeletonRow}>
              <Skeleton height={40} radius={20} width={40} />
              <View style={styles.flex}>
                <Skeleton height={14} width="60%" />
                <Skeleton height={12} width="40%" />
              </View>
            </View>
          ) : options.length ? (
            <Card padding="none" style={styles.listCard}>
              {options.map((option, index) => (
                <ListRow
                  divider={index < options.length - 1}
                  key={option.id}
                  leading={<Avatar name={option.title || 'Audio'} size={40} uri={option.image} />}
                  onPress={() =>
                    onChange({
                      ...option,
                      audio_volume: 100,
                      video_volume: 100,
                    })
                  }
                  subtitle={[option.artist, formatAudioDuration(option.duration)].filter(Boolean).join(' · ')}
                  title={option.title || option.id}
                />
              ))}
            </Card>
          ) : (
            <AppText tone="muted" variant="caption">
              No audio found.
            </AppText>
          )}
        </>
      )}
    </View>
  );
}

function AudioVolumeControl({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <View style={styles.fieldGroup}>
      <AppText tone="muted" variant="captionStrong">
        {label}: {value}
      </AppText>
      <View style={styles.quickGrid}>
        {[0, 25, 50, 75, 100].map((volume) => (
          <Chip
            key={volume}
            label={String(volume)}
            onPress={() => onChange(volume)}
            selected={value === volume}
          />
        ))}
      </View>
    </View>
  );
}

function formatAudioDuration(duration?: number) {
  if (!duration) {
    return '';
  }

  const seconds = Math.floor(duration / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function MediaSettingsField({
  field,
  media,
  onChange,
  value,
}: {
  field: Extract<ProviderSettingsField, { type: 'media' }>;
  media: ComposerMedia[];
  onChange: (value: unknown) => void;
  value: unknown;
}) {
  const selectedPath = typeof value === 'object' && value ? String((value as { path?: string }).path ?? '') : '';

  return (
    <View style={styles.fieldGroup}>
      <AppText tone="muted" variant="label">
        {field.label}
      </AppText>
      {media.length ? (
        <ScrollView contentContainerStyle={styles.selectedChannels} horizontal showsHorizontalScrollIndicator={false}>
          {media.map((item) => (
            <Chip
              key={item.localId}
              label={item.name}
              onPress={() =>
                onChange(
                  item.serverId && item.path
                    ? {
                        id: item.serverId,
                        path: item.path,
                        ...(item.thumbnail ? { thumbnail: item.thumbnail } : {}),
                      }
                    : undefined
                )
              }
              selected={selectedPath === item.path}
            />
          ))}
          <Chip label="None" onPress={() => onChange(undefined)} selected={!selectedPath} />
        </ScrollView>
      ) : (
        <AppText tone="muted" variant="caption">
          Attach and upload media first, then choose it here.
        </AppText>
      )}
    </View>
  );
}

function CommunityListField({
  field,
  onChange,
  value,
}: {
  field: Extract<ProviderSettingsField, { type: 'communityList' }>;
  onChange: (value: unknown) => void;
  value: unknown;
}) {
  const items = Array.isArray(value) ? (value as Array<{ value?: Record<string, unknown> }>) : [];
  const currentItems = items.length ? items : [{ value: {} }];

  function updateItem(index: number, patch: Record<string, unknown>) {
    const next = currentItems.map((item, currentIndex) =>
      currentIndex === index ? { value: { ...(item.value ?? {}), ...patch } } : item
    );

    onChange(next);
  }

  function removeItem(index: number) {
    const next = currentItems.filter((_, currentIndex) => currentIndex !== index);

    onChange(next);
  }

  function addItem() {
    onChange([...currentItems, { value: {} }]);
  }

  return (
    <View style={styles.fieldGroup}>
      <AppText tone="muted" variant="label">
        {requiredLabel(field)}
      </AppText>
      {currentItems.map((item, index) => {
        const itemValue = item.value ?? {};
        const community = String(itemValue.subreddit ?? itemValue.id ?? '');
        const title = String(itemValue.title ?? '');

        return (
          <Card gap={spacing.md} key={index} inset>
            <View style={styles.sectionHeader}>
              <AppText variant="bodyStrong">
                {field.provider === 'reddit' ? 'Subreddit' : field.provider === 'lemmy' ? 'Community' : 'Channel'}
              </AppText>
              {currentItems.length > 1 ? (
                <Button label="Remove" onPress={() => removeItem(index)} size="sm" variant="ghost" />
              ) : null}
            </View>
            <Field
              autoCapitalize="none"
              autoCorrect={false}
              label={field.provider === 'reddit' ? 'Subreddit name' : 'Community / channel ID'}
              onChangeText={(text) =>
                updateItem(
                  index,
                  field.provider === 'wrapcast'
                    ? { id: text, subreddit: text }
                    : { id: text, subreddit: text, is_flair_required: false, type: itemValue.type ?? 'self' }
                )
              }
              placeholder={field.provider === 'reddit' ? '/r/reactnative' : 'general'}
              value={community}
            />
            {field.provider !== 'wrapcast' ? (
              <>
                <Field
                  label="Title"
                  onChangeText={(text) => updateItem(index, { title: text })}
                  placeholder="Post title"
                  value={title}
                />
                {field.provider === 'reddit' ? (
                  <View style={styles.fieldGroup}>
                    <AppText tone="muted" variant="label">
                      Post type
                    </AppText>
                    <View style={styles.quickGrid}>
                      {[
                        { label: 'Post', value: 'self' },
                        { label: 'Link', value: 'link' },
                        { label: 'Image', value: 'image' },
                        { label: 'Video', value: 'video' },
                        { label: 'GIF', value: 'videogif' },
                      ].map((option) => (
                        <Chip
                          key={option.value}
                          label={option.label}
                          onPress={() => updateItem(index, { type: option.value })}
                          selected={(itemValue.type ?? 'self') === option.value}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
                {(field.provider === 'lemmy' || itemValue.type === 'link') ? (
                  <Field
                    autoCapitalize="none"
                    autoCorrect={false}
                    inputMode="url"
                    label="URL"
                    onChangeText={(text) => updateItem(index, { url: text })}
                    placeholder="https://example.com"
                    value={String(itemValue.url ?? '')}
                  />
                ) : null}
              </>
            ) : null}
          </Card>
        );
      })}
      <Button
        label={
          field.provider === 'reddit'
            ? 'Add subreddit'
            : field.provider === 'lemmy'
            ? 'Add community'
            : 'Add channel'
        }
        onPress={addItem}
        variant="soft"
      />
    </View>
  );
}

function optionMatchesValue(option: ProviderOption, value: unknown, mode?: 'number' | 'string') {
  if (typeof value === 'object' && value) {
    return String((value as ProviderOption).value) === String(option.value);
  }

  const optionValue = mode === 'number' ? Number(option.value) : String(option.value);

  return String(value) === String(optionValue);
}

function requiredLabel(field: { label: string; required?: boolean }) {
  return field.required ? `${field.label} *` : field.label;
}

function ChannelRow({
  divider,
  integration,
  onToggle,
  selected,
}: {
  divider: boolean;
  integration: IntegrationListItem;
  onToggle: () => void;
  selected: boolean;
}) {
  const { colors } = useTheme();
  const needsAttention = !!integration.disabled || !!integration.refreshNeeded;
  const subtitle = integration.refreshNeeded
    ? 'Reconnect on web'
    : integration.disabled
    ? 'Disabled'
    : integration.identifier;

  return (
    <ListRow
      divider={divider}
      leading={
        <Avatar
          badgeUri={getPlatformIconUrl(integration.identifier)}
          name={integration.name}
          shape="circle"
          uri={integration.picture}
        />
      }
      onPress={needsAttention ? undefined : onToggle}
      selected={selected}
      subtitle={subtitle}
      subtitleTone={needsAttention ? 'danger' : selected ? 'tint' : 'muted'}
      title={integration.name}
      trailing={
        <View
          style={[
            styles.radio,
            {
              backgroundColor: selected ? colors.tint : 'transparent',
              borderColor: selected ? colors.tint : colors.borderStrong,
              opacity: needsAttention ? 0.45 : 1,
            },
          ]}
        />
      }
    />
  );
}

function MediaLibraryRow({
  divider,
  media,
  onPress,
  selected,
}: {
  divider: boolean;
  media: UploadedMedia;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <ListRow
      divider={divider}
      leading={
        <Image
          accessibilityLabel={mediaName(media)}
          source={{ uri: media.thumbnail || media.path }}
          style={styles.libraryThumb}
        />
      }
      onPress={onPress}
      selected={selected}
      subtitle={media.alt || media.path}
      subtitleTone={selected ? 'tint' : 'muted'}
      title={mediaName(media)}
      trailing={selected ? <StatusBadge label="Added" tone="tint" /> : undefined}
    />
  );
}

function SelectedChannelPill({
  integration,
  onPress,
}: {
  integration: IntegrationListItem;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <ScalePressable onPress={onPress} style={[styles.selectedPill, { borderColor: colors.border }]}>
      <Avatar
        badgeUri={getPlatformIconUrl(integration.identifier)}
        name={integration.name}
        shape="circle"
        size={28}
        uri={integration.picture}
      />
      <AppText numberOfLines={1} style={styles.selectedPillText} variant="captionStrong">
        {integration.name}
      </AppText>
    </ScalePressable>
  );
}

function ChannelOverride({
  integration,
  onChange,
  onClear,
  value,
}: {
  integration: IntegrationListItem;
  onChange: (value: string) => void;
  onClear: () => void;
  value?: string;
}) {
  const customized = value !== undefined;

  return (
    <Card gap={spacing.md}>
      <View style={styles.sectionHeader}>
        <AppText numberOfLines={1} style={styles.flex} variant="bodyStrong">
          {integration.name}
        </AppText>
        <Button
          label={customized ? 'Use global' : 'Customize'}
          onPress={() => (customized ? onClear() : onChange(''))}
          size="sm"
          variant="ghost"
        />
      </View>
      {customized ? (
        <Field
          accessibilityLabel={`Content for ${integration.name}`}
          multiline
          onChangeText={onChange}
          placeholder="Channel-specific text"
          value={value ?? ''}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  channelEmpty: {
    borderCurve: 'continuous',
    borderRadius: 12,
    padding: spacing.md,
  },
  channelPickerContent: {
    paddingVertical: spacing.xs,
  },
  channelPickerEmpty: {
    paddingVertical: spacing.lg,
  },
  channelPickerList: {
    borderCurve: 'continuous',
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: 340,
    overflow: 'hidden',
  },
  channelSummaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  mediaActions: {
    gap: spacing.xs,
    padding: spacing.sm,
  },
  mediaCard: {
    overflow: 'hidden',
    width: 132,
  },
  mediaEmpty: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  mediaEmptyIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  mediaOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  mediaRow: {
    gap: spacing.md,
  },
  mediaHeaderActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  mediaLibraryContent: {
    paddingVertical: spacing.xs,
  },
  mediaLibraryList: {
    borderCurve: 'continuous',
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: 330,
    overflow: 'hidden',
  },
  mediaThumb: {
    height: 132,
    width: '100%',
  },
  libraryPager: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  libraryThumb: {
    backgroundColor: '#111111',
    borderCurve: 'continuous',
    borderRadius: 10,
    height: 44,
    width: 44,
  },
  listCard: {
    overflow: 'hidden',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  radio: {
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    width: 18,
  },
  scheduleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selectedChannels: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  selectedPill: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  selectedPillText: {
    maxWidth: 130,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  setupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  setupIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  setupSteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sheetStack: {
    gap: spacing.lg,
  },
  skeletonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  stack: {
    gap: spacing.xl,
  },
  switchThumb: {
    borderRadius: 10,
    height: 20,
    width: 20,
  },
  switchTrack: {
    borderRadius: 13,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 42,
  },
});
