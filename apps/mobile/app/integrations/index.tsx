import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';

import {
  connectIntegration,
  getAvailableIntegrations,
  getIntegrations,
  startIntegrationAuth,
} from '@/src/api/integrations.api';
import type { AvailableIntegrationProvider, IntegrationListItem } from '@/src/api/integrations.api';
import { ApiError } from '@/src/api/client';
import { queryClient } from '@/src/providers/query-client';
import {
  encodeIntegrationCredentials,
  getFieldValidationError,
  getIntegrationCallbackUrl,
  getIntegrationReturnParams,
  getPlatformIconUrl,
  getProviderDisplayName,
  getTimezoneOffset,
} from '@/src/services/integrations.service';
import {
  AppSheet,
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  Field,
  ListRow,
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

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Unable to complete request.';
}

function getStatus(integration: IntegrationListItem) {
  if (integration.refreshNeeded) {
    return { label: 'Reconnect', tone: 'danger' as Tone };
  }

  if (integration.inBetweenSteps) {
    return { label: 'Finish setup', tone: 'warning' as Tone };
  }

  if (integration.disabled) {
    return { label: 'Disabled', tone: 'neutral' as Tone };
  }

  return { label: 'Connected', tone: 'success' as Tone };
}

function providerMeta(provider: AvailableIntegrationProvider, connected: boolean) {
  if (provider.isChromeExtension || provider.isWeb3) {
    return 'Complete on web';
  }

  if (provider.customFields?.length) {
    return 'API credentials';
  }

  if (provider.isExternal) {
    return 'Instance URL required';
  }

  return connected ? 'Add another account' : 'OAuth connection';
}

export default function IntegrationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] = useState<AvailableIntegrationProvider | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [externalUrl, setExternalUrl] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [refreshTarget, setRefreshTarget] = useState<string | null>(null);

  const integrationsQuery = useQuery({
    queryFn: getIntegrations,
    queryKey: ['integrations', 'list'],
  });
  const providersQuery = useQuery({
    queryFn: getAvailableIntegrations,
    queryKey: ['integrations', 'providers'],
  });

  const integrations = integrationsQuery.data?.integrations ?? [];
  const providers = providersQuery.data?.social ?? [];
  const providerGroups = useMemo(
    () => [
      {
        title: 'OAuth',
        meta: 'Browser authorization',
        data: providers.filter(
          (provider) =>
            !provider.customFields?.length &&
            !provider.isExternal &&
            !provider.isChromeExtension &&
            !provider.isWeb3
        ),
      },
      {
        title: 'Credentials',
        meta: 'API keys and instance URLs',
        data: providers.filter((provider) => provider.customFields?.length || provider.isExternal),
      },
      {
        title: 'Web only',
        meta: 'Complete from desktop',
        data: providers.filter((provider) => provider.isChromeExtension || provider.isWeb3),
      },
    ],
    [providers]
  );
  const connectedIdentifiers = useMemo(
    () => new Set(integrations.map((integration) => integration.identifier)),
    [integrations]
  );
  const providerFields = selectedProvider?.customFields ?? [];
  const isRefreshing = integrationsQuery.isRefetching || providersQuery.isRefetching;
  const attentionCount = integrations.filter(
    (integration) => integration.refreshNeeded || integration.inBetweenSteps
  ).length;

  const customConnectMutation = useMutation({
    mutationFn: async (provider: AvailableIntegrationProvider) => {
      const validationError = providerFields
        .map((field) => getFieldValidationError(field, fieldValues[field.key] ?? ''))
        .find(Boolean);

      if (validationError) {
        throw new Error(validationError);
      }

      const redirectUrl = getIntegrationCallbackUrl();
      const { err, url: state } = await startIntegrationAuth(provider.identifier, {
        redirectUrl,
        refresh: refreshTarget ?? undefined,
      });

      if (err || !state) {
        throw new Error('Could not start channel connection.');
      }

      const response = await connectIntegration(provider.identifier, {
        code: encodeIntegrationCredentials(fieldValues),
        refresh: refreshTarget ?? undefined,
        state,
        timezone: getTimezoneOffset(),
      });

      if (response.inBetweenSteps && response.id) {
        closeSheet();
        router.push({
          pathname: '/integrations/pages',
          params: { id: response.id, provider: provider.identifier },
        } as unknown as Href);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['integrations'] });
      closeSheet();
      setFeedback({
        kind: 'success',
        message: `${getProviderDisplayName(provider)} ${refreshTarget ? 'reconnected' : 'connected'}.`,
      });
    },
    onError(error) {
      setFeedback({ kind: 'error', message: getErrorMessage(error) });
    },
  });

  async function refresh() {
    await Promise.all([integrationsQuery.refetch(), providersQuery.refetch()]);
  }

  function closeSheet() {
    setSelectedProvider(null);
    setFieldValues({});
    setExternalUrl('');
    setRefreshTarget(null);
  }

  function openProvider(provider: AvailableIntegrationProvider) {
    setFeedback(null);
    setExternalUrl('');
    setRefreshTarget(null);
    setSelectedProvider(provider);
    setFieldValues(
      (provider.customFields ?? []).reduce<Record<string, string>>(
        (acc, field) => ({ ...acc, [field.key]: field.defaultValue ?? '' }),
        {}
      )
    );
  }

  function reconnectIntegration(provider: AvailableIntegrationProvider, integration: IntegrationListItem) {
    const refresh = integration.internalId ?? integration.id;

    if (provider.customFields?.length || provider.isExternal) {
      openProvider(provider);
      setRefreshTarget(refresh);
      return;
    }

    void startOAuth(provider, { refresh });
  }

  async function startOAuth(provider: AvailableIntegrationProvider, options: { refresh?: string } = {}) {
    setFeedback(null);
    setBusyProvider(provider.identifier);

    try {
      const redirectUrl = getIntegrationCallbackUrl();
      const { err, url } = await startIntegrationAuth(provider.identifier, {
        externalUrl: provider.isExternal ? externalUrl.trim() : undefined,
        redirectUrl,
        refresh: options.refresh,
      });

      if (err || !url) {
        throw new Error('Could not start channel connection.');
      }

      const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl, {
        controlsColor: colors.tint,
        dismissButtonStyle: 'close',
      });

      if (result.type === 'success' && 'url' in result && result.url) {
        await queryClient.invalidateQueries({ queryKey: ['integrations'] });
        closeSheet();
        router.replace({
          pathname: '/integrations/done',
          params: getIntegrationReturnParams(result.url),
        } as unknown as Href);
        return;
      }

      if (result.type === 'cancel') {
        setFeedback({ kind: 'error', message: 'Connection was cancelled.' });
      }
    } catch (error) {
      setFeedback({ kind: 'error', message: getErrorMessage(error) });
    } finally {
      setBusyProvider(null);
    }
  }

  function submitSelectedProvider() {
    if (!selectedProvider) {
      return;
    }

    if (selectedProvider.customFields?.length) {
      customConnectMutation.mutate(selectedProvider);
      return;
    }

    if (selectedProvider.isExternal && !externalUrl.trim()) {
      setFeedback({ kind: 'error', message: 'Enter the provider instance URL.' });
      return;
    }

    void startOAuth(selectedProvider, { refresh: refreshTarget ?? undefined });
  }

  return (
    <>
      <Screen
        inset
        refreshControl={
          <RefreshControl refreshing={isRefreshing} tintColor={colors.tint} onRefresh={refresh} />
        }
        variant="form">
        <Animated.View entering={FadeInDown.duration(motion.duration.normal)} style={styles.stack}>
          <ScreenHeader
            kicker="Channels"
            subtitle={`${integrations.length} connected · ${providers.length} providers`}
            title="Integrations"
          />

          <Card gap={spacing.md}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.tintSoft }]}>
                <SymbolView
                  name={{ android: 'hub', ios: 'point.3.connected.trianglepath.dotted', web: 'hub' }}
                  size={20}
                  tintColor={colors.tint}
                />
              </View>
              <View style={styles.flex}>
                <AppText variant="heading">Publishing network</AppText>
                <AppText tone="muted" variant="caption">
                  Keep every connected channel ready before posts hit the queue.
                </AppText>
              </View>
            </View>
            <View style={styles.badges}>
              <StatusBadge label={`${integrations.length} connected`} tone="success" />
              <StatusBadge label={`${attentionCount} need action`} tone={attentionCount ? 'warning' : 'neutral'} />
            </View>
          </Card>

          <View style={styles.section}>
            <SectionHeading
              meta={integrationsQuery.isLoading ? 'Loading' : 'Reconnect and complete setup'}
              title="Connected"
            />
            {integrationsQuery.isLoading ? (
              <LoadingRows />
            ) : integrations.length ? (
              <Card padding="none" style={styles.listCard}>
                {integrations.map((integration, index) => {
                  const provider = providers.find((item) => item.identifier === integration.identifier) ?? {
                    identifier: integration.identifier,
                    name: integration.identifier,
                  };

                  return (
                    <ConnectedChannelRow
                      divider={index < integrations.length - 1}
                      integration={integration}
                      key={integration.id}
                      onComplete={() =>
                        router.push({
                          pathname: '/integrations/pages',
                          params: { id: integration.id, provider: integration.identifier },
                        } as unknown as Href)
                      }
                      onReconnect={() => reconnectIntegration(provider, integration)}
                      reconnecting={busyProvider === integration.identifier}
                    />
                  );
                })}
              </Card>
            ) : (
              <EmptyState
                body="Add a provider below, then return to compose once the account is connected."
                title="No channels connected"
              />
            )}
          </View>

          <View style={styles.section}>
            <SectionHeading
              meta={providersQuery.isLoading ? 'Loading' : 'Grouped by connection method'}
              title="Add a channel"
            />
            {providersQuery.isLoading ? (
              <LoadingRows />
            ) : providers.length ? (
              <View style={styles.providerGroups}>
                {providerGroups
                  .filter((group) => group.data.length)
                  .map((group) => (
                    <ProviderSection
                      connectedIdentifiers={connectedIdentifiers}
                      group={group}
                      key={group.title}
                      onPress={openProvider}
                      selectedIdentifier={selectedProvider?.identifier}
                    />
                  ))}
              </View>
            ) : (
              <EmptyState body="No providers were returned by the API." title="No providers available" />
            )}
          </View>
        </Animated.View>

        <AppSheet
          isPresented={!!selectedProvider}
          onDismiss={closeSheet}
          subtitle={
            selectedProvider
              ? selectedProvider.customFields?.length
                ? 'Credentials stay encrypted server-side.'
                : 'Postiz will open the provider authorization flow.'
              : undefined
          }
          title={selectedProvider ? getProviderDisplayName(selectedProvider) : undefined}>
          {selectedProvider ? (
            <View style={styles.sheetStack}>
              <View style={styles.sheetProviderRow}>
                <Avatar
                  name={getProviderDisplayName(selectedProvider)}
                  shape="circle"
                  size={44}
                  uri={getPlatformIconUrl(selectedProvider.identifier)}
                />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{providerMeta(selectedProvider, false)}</AppText>
                  <AppText tone="muted" variant="caption">
                    {refreshTarget ? 'Reconnect this channel.' : 'Add this provider to your workspace.'}
                  </AppText>
                </View>
              </View>

              {selectedProvider.isExternal ? (
                <Field
                  autoCapitalize="none"
                  autoCorrect={false}
                  inputMode="url"
                  label="Instance URL"
                  onChangeText={setExternalUrl}
                  placeholder="https://your-instance.com"
                  value={externalUrl}
                />
              ) : null}

              {providerFields.map((field) => (
                <Field
                  autoCapitalize="none"
                  autoCorrect={false}
                  hint={field.hint || undefined}
                  key={field.key}
                  label={field.label}
                  onChangeText={(value) => setFieldValues((current) => ({ ...current, [field.key]: value }))}
                  placeholder={field.hint || field.label}
                  secureTextEntry={field.type === 'password'}
                  value={fieldValues[field.key] ?? ''}
                />
              ))}

              <Button
                label={refreshTarget ? 'Reconnect channel' : 'Connect channel'}
                loading={customConnectMutation.isPending || busyProvider === selectedProvider.identifier}
                onPress={submitSelectedProvider}
              />
            </View>
          ) : null}
        </AppSheet>
      </Screen>
      <Toast kind={feedback?.kind ?? 'info'} message={feedback?.message} />
    </>
  );
}

function SectionHeading({ meta, title }: { meta?: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="heading">{title}</AppText>
      {meta ? (
        <AppText numberOfLines={1} style={styles.flex} tone="muted" variant="caption">
          {meta}
        </AppText>
      ) : null}
    </View>
  );
}

function LoadingRows() {
  return (
    <Card gap={spacing.md}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.loadingRow}>
          <Skeleton height={38} radius={10} width={38} />
          <View style={styles.flex}>
            <Skeleton height={14} width="52%" />
            <Skeleton height={12} width="38%" />
          </View>
        </View>
      ))}
    </Card>
  );
}

function ConnectedChannelRow({
  divider,
  integration,
  onComplete,
  onReconnect,
  reconnecting,
}: {
  divider: boolean;
  integration: IntegrationListItem;
  onComplete: () => void;
  onReconnect: () => void;
  reconnecting: boolean;
}) {
  const status = getStatus(integration);

  return (
    <ListRow
      divider={divider}
      leading={
        <Avatar
          badgeUri={getPlatformIconUrl(integration.identifier)}
          name={integration.name}
          shape="circle"
          size={42}
          uri={integration.picture}
        />
      }
      rowStyle={styles.integrationRow}
      subtitle={integration.display || integration.identifier}
      title={integration.name}
      trailing={
        <View style={styles.rowTrailing}>
          <StatusBadge label={status.label} tone={status.tone} />
          {integration.refreshNeeded ? (
            <Button
              label="Reconnect"
              loading={reconnecting}
              onPress={onReconnect}
              size="sm"
              variant="soft"
            />
          ) : integration.inBetweenSteps ? (
            <Button label="Finish" onPress={onComplete} size="sm" variant="soft" />
          ) : null}
        </View>
      }
    />
  );
}

function ProviderSection({
  connectedIdentifiers,
  group,
  onPress,
  selectedIdentifier,
}: {
  connectedIdentifiers: Set<string>;
  group: { title: string; meta: string; data: AvailableIntegrationProvider[] };
  onPress: (provider: AvailableIntegrationProvider) => void;
  selectedIdentifier?: string;
}) {
  return (
    <View style={styles.providerGroup}>
      <View style={styles.providerGroupHeader}>
        <AppText variant="captionStrong">{group.title}</AppText>
        <AppText tone="muted" variant="footnote">
          {group.meta}
        </AppText>
      </View>
      <Card padding="none" style={styles.listCard}>
        {group.data.map((provider, index) => {
          const webOnly = !!provider.isChromeExtension || !!provider.isWeb3;

          return (
            <ProviderRow
              connected={connectedIdentifiers.has(provider.identifier)}
              disabled={webOnly}
              divider={index < group.data.length - 1}
              key={provider.identifier}
              onPress={() => onPress(provider)}
              provider={provider}
              selected={provider.identifier === selectedIdentifier}
            />
          );
        })}
      </Card>
    </View>
  );
}

function ProviderRow({
  connected,
  disabled,
  divider,
  onPress,
  provider,
  selected,
}: {
  connected: boolean;
  disabled: boolean;
  divider: boolean;
  onPress: () => void;
  provider: AvailableIntegrationProvider;
  selected: boolean;
}) {
  return (
    <ListRow
      divider={divider}
      leading={
        <Avatar
          name={provider.name}
          shape="circle"
          size={38}
          uri={getPlatformIconUrl(provider.identifier)}
        />
      }
      onPress={disabled ? undefined : onPress}
      rowStyle={[styles.integrationRow, disabled && styles.disabledRow]}
      selected={selected}
      subtitle={providerMeta(provider, connected)}
      subtitleTone={disabled ? 'muted' : selected ? 'tint' : 'muted'}
      title={provider.name}
      trailing={
        disabled ? (
          <StatusBadge label="Web" tone="neutral" />
        ) : (
          <StatusBadge label={connected ? 'Added' : 'Ready'} tone={connected ? 'success' : 'tint'} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  disabledRow: {
    opacity: 0.58,
  },
  integrationRow: {
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  listCard: {
    overflow: 'hidden',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  providerGroup: {
    gap: spacing.sm,
  },
  providerGroupHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  providerGroups: {
    gap: spacing.lg,
  },
  rowTrailing: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sheetStack: {
    gap: spacing.lg,
  },
  sheetProviderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  stack: {
    gap: spacing.xl,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
