import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  getIntegrationFunction,
  getIntegrations,
  saveIntegrationPage,
} from '@/src/api/integrations.api';
import type { IntegrationProviderPage } from '@/src/api/integrations.api';
import { ApiError } from '@/src/api/client';
import { queryClient } from '@/src/providers/query-client';
import {
  getPageImage,
  getPageSelectionPayload,
  getPageSubtitle,
  getProviderPageFunction,
} from '@/src/services/integrations.service';
import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  ListRow,
  motion,
  Screen,
  ScreenHeader,
  Skeleton,
  spacing,
  Toast,
  useTheme,
} from '@/src/ui';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Unable to complete request.';
}

export default function IntegrationPagesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = getSingleParam(params.id);
  const provider = getSingleParam(params.provider);
  const pageFunction = provider ? getProviderPageFunction(provider) : undefined;
  const [selectedPage, setSelectedPage] = useState<IntegrationProviderPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const integrationsQuery = useQuery({
    queryFn: getIntegrations,
    queryKey: ['integrations', 'list'],
  });
  const pagesQuery = useQuery({
    enabled: !!id && !!pageFunction,
    queryFn: () => getIntegrationFunction<IntegrationProviderPage[]>(id!, pageFunction!),
    queryKey: ['integrations', 'pages', id, pageFunction],
  });
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!id || !provider || !selectedPage) {
        throw new Error('Select a page to continue.');
      }

      return saveIntegrationPage(id, getPageSelectionPayload(provider, selectedPage));
    },
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['integrations'] });
      router.replace('/integrations/done?msg=Channel%20Added' as Href);
    },
    onError(saveError) {
      setError(getErrorMessage(saveError));
    },
  });

  const integration = integrationsQuery.data?.integrations.find((item) => item.id === id);
  const pages = pagesQuery.data || [];
  const loading = integrationsQuery.isLoading || pagesQuery.isLoading;
  const refreshing = integrationsQuery.isRefetching || pagesQuery.isRefetching;

  async function refresh() {
    await Promise.all([integrationsQuery.refetch(), pagesQuery.refetch()]);
  }

  return (
    <>
      <Screen inset refreshControl={<RefreshControl onRefresh={refresh} refreshing={refreshing} />}>
        <Animated.View entering={FadeInDown.duration(motion.duration.normal)} style={styles.stack}>
        <ScreenHeader
          kicker={integration?.name || provider || 'Channel'}
          subtitle="Pick which page this channel should publish to."
          title="Select a page"
        />

        {!pageFunction ? (
          <EmptyState
            body="This provider does not expose page selection in the mobile app yet."
            title="Not available"
          />
        ) : loading ? (
          <Card gap={spacing.md}>
            {[0, 1, 2].map((item) => (
              <View key={item} style={styles.skeletonRow}>
                <Skeleton height={44} radius={10} width={44} />
                <View style={styles.skeletonCopy}>
                  <Skeleton height={15} width="56%" />
                  <Skeleton height={12} width="38%" />
                </View>
              </View>
            ))}
          </Card>
        ) : pages.length ? (
          <Card padding="none">
            {pages.map((page, index) => {
              const selected = selectedPage === page;
              const title = String(page.name || page.username || page.id || `Page ${index + 1}`);

              return (
                <ListRow
                  divider={index < pages.length - 1}
                  key={String(page.id ?? index)}
                  leading={<Avatar name={title} size={44} uri={getPageImage(page)} />}
                  onPress={() => {
                    setError(null);
                    setSelectedPage(page);
                  }}
                  selected={selected}
                  subtitle={String(getPageSubtitle(page))}
                  subtitleTone={selected ? 'tint' : 'muted'}
                  title={title}
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
        ) : (
          <EmptyState body="No eligible pages were returned for this channel." title="No pages" />
        )}

        <Button
          disabled={!selectedPage}
          label="Save channel"
          loading={saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
          size="lg"
        />
        </Animated.View>
      </Screen>
      <Toast kind="error" message={error || (pagesQuery.error ? getErrorMessage(pagesQuery.error) : null)} />
    </>
  );
}

const styles = StyleSheet.create({
  radio: {
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    width: 18,
  },
  skeletonCopy: {
    flex: 1,
    gap: spacing.sm - 2,
  },
  skeletonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  stack: {
    gap: spacing.xl,
  },
});
