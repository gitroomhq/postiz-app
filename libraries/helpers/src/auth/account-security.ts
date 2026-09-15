export const LINKABLE_PROVIDERS = [
  'GOOGLE',
  'GITHUB',
  'APPLE',
  'GENERIC',
  'FARCASTER',
  'WALLET',
] as const;

export type LinkableProvider = (typeof LINKABLE_PROVIDERS)[number];

export const isLinkableProvider = (provider: string): provider is LinkableProvider =>
  (LINKABLE_PROVIDERS as readonly string[]).includes(provider.toUpperCase());

export const hasPasswordHash = (password?: string | null) =>
  !!password && password.startsWith('$2');

/** Remaining login methods after dropping one identity must still be > 0. */
export const canUnlinkIdentity = (
  hasPassword: boolean,
  identityCount: number
) => (hasPassword ? 1 : 0) + identityCount > 1;

export type LinkIdentityDecision =
  | { ok: true; reason: 'create' | 'already' }
  | { ok: false; reason: 'taken' | 'provider_taken' };

/**
 * Link this provider account onto currentUserId.
 * taken: another user already owns (provider, accountId).
 * provider_taken: this user already has a different account for the provider.
 */
export const decideLinkIdentity = (args: {
  currentUserId: string;
  existingOwnerId?: string | null;
  currentProviderOwnerId?: string | null;
}): LinkIdentityDecision => {
  if (args.existingOwnerId && args.existingOwnerId !== args.currentUserId) {
    return { ok: false, reason: 'taken' };
  }
  if (
    args.currentProviderOwnerId &&
    args.currentProviderOwnerId !== args.currentUserId
  ) {
    return { ok: false, reason: 'taken' };
  }
  if (args.existingOwnerId === args.currentUserId) {
    return { ok: true, reason: 'already' };
  }
  if (args.currentProviderOwnerId === args.currentUserId) {
    return { ok: false, reason: 'provider_taken' };
  }
  return { ok: true, reason: 'create' };
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const emailsMatch = (left: string, right: string) =>
  normalizeEmail(left) === normalizeEmail(right);

/** Password login / forgot: LOCAL with a hash, else any provider with a hash. */
export const pickUserWithPassword = <
  T extends { providerName: string; password?: string | null }
>(
  rows: T[]
): T | null =>
  rows.find(
    (row) => row.providerName === 'LOCAL' && hasPasswordHash(row.password)
  ) ||
  rows.find((row) => hasPasswordHash(row.password)) ||
  null;

export const sessionsNotBeforeFrom = (nowMs = Date.now()) =>
  new Date(Math.floor(nowMs / 1000) * 1000);

/** A set-password email token must not skip current-password once a hash exists. */
export const canCompleteSetPasswordWithToken = (hasPassword: boolean) =>
  !hasPassword;

export const oauthLinkNonceFromState = (state?: string) =>
  !!state && state.startsWith('link-') && state.length > 5
    ? state.slice(5)
    : null;

export const oauthLinkTicketMatchesState = (
  nonce: string | undefined,
  state?: string
) => {
  const expected = oauthLinkNonceFromState(state);
  return !!nonce && !!expected && nonce === expected;
};

/**
 * After unlinking the native providerName, keep login working: LOCAL if a
 * password remains, otherwise the next remaining identity.
 */
export const nextProviderNameAfterUnlink = (args: {
  nativeProvider: string;
  unlinkedProvider: string;
  hasPassword: boolean;
  remainingProviders: string[];
}): string | null => {
  if (args.nativeProvider !== args.unlinkedProvider) {
    return null;
  }
  if (args.hasPassword) {
    return 'LOCAL';
  }
  return args.remainingProviders[0] || null;
};
