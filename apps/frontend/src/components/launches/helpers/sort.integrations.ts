/**
 * Connected-channel display order.
 *
 * Mirrors `socialIntegrationList` in
 * `libraries/nestjs-libraries/src/integrations/integration.manager.ts` —
 * the same order Add Channel uses (via `/integrations/social`).
 * Keep this list in sync when adding providers there.
 */
export const PROVIDER_DISPLAY_ORDER = [
  'x',
  'linkedin',
  'linkedin-page',
  'reddit',
  'instagram',
  'instagram-standalone',
  'facebook',
  'threads',
  'youtube',
  'gmb',
  'tiktok',
  'pinterest',
  'dribbble',
  'discord',
  'slack',
  'kick',
  'twitch',
  'mastodon',
  'bluesky',
  'lemmy',
  'wrapcast',
  'telegram',
  'nostr',
  'vk',
  'medium',
  'devto',
  'hashnode',
  'wordpress',
  'listmonk',
  'moltbook',
  'whop',
  'skool',
  'mewe',
  'tumblr',
] as const;

const providerRank = new Map<string, number>(
  PROVIDER_DISPLAY_ORDER.map((id, index) => [id, index])
);

type IntegrationSortFields = {
  identifier?: string;
  providerIdentifier?: string;
  name?: string;
  disabled?: boolean;
  id?: string;
};

function platformKey(item: IntegrationSortFields): string {
  return item.identifier || item.providerIdentifier || '';
}

/**
 * Sort connected integrations for consistent UI lists:
 * 1. enabled before disabled (existing panel convention)
 * 2. platform importance (`PROVIDER_DISPLAY_ORDER`)
 * 3. account name within the same platform
 * Unknown platforms sink after known ones, then by name.
 *
 * Accepts null/undefined/non-arrays safely — some SWR keys historically
 * cached the full `{ integrations }` payload; callers should still pass arrays.
 */
export function sortIntegrationsByProviderImportance<T>(
  integrations: T[] | null | undefined
): T[] {
  if (!Array.isArray(integrations)) {
    return [];
  }
  return [...integrations].sort((a, b) => {
    const left = a as IntegrationSortFields;
    const right = b as IntegrationSortFields;

    const disabledA = left.disabled ? 1 : 0;
    const disabledB = right.disabled ? 1 : 0;
    if (disabledA !== disabledB) {
      return disabledA - disabledB;
    }

    const keyA = platformKey(left);
    const keyB = platformKey(right);
    const rankA = providerRank.get(keyA) ?? PROVIDER_DISPLAY_ORDER.length;
    const rankB = providerRank.get(keyB) ?? PROVIDER_DISPLAY_ORDER.length;
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const nameCmp = (left.name || '').localeCompare(right.name || '', undefined, {
      sensitivity: 'base',
    });
    if (nameCmp !== 0) {
      return nameCmp;
    }

    return (left.id || '').localeCompare(right.id || '');
  });
}
