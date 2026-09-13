export type OauthIdentity = { id: string; email?: string | null };

export type LinkableUser = {
  id: string;
  activated: boolean;
  providerId?: string | null;
  appleProviderId?: string | null;
};

export type OauthUserStore<T extends LinkableUser = LinkableUser> = {
  getUserByProvider: (
    providerId: string,
    provider: string,
  ) => Promise<T | null>;
  getUserByEmail: (email: string) => Promise<T | null>;
  attachProviderId: (userId: string, providerId: string) => Promise<unknown>;
  attachAppleProviderId?: (
    userId: string,
    appleProviderId: string,
  ) => Promise<unknown>;
  activateUser: (userId: string) => Promise<unknown>;
};

// Google userinfo and Apple's identity token (first grant) are a verified inbox.
// Password login keeps providerName LOCAL.
export const shouldLinkOauthToLocalEmail = (
  provider: string,
  email?: string | null,
) => (provider === 'GOOGLE' || provider === 'APPLE') && !!email;

export const shouldLinkGoogleToLocalEmail = (
  provider: string,
  email?: string | null,
) => provider === 'GOOGLE' && !!email;

export const shouldAttachGoogleId = (
  existingProviderId?: string | null,
  googleId?: string,
) => !existingProviderId || existingProviderId === googleId;

export const shouldAttachAppleId = (
  existingAppleId?: string | null,
  appleId?: string,
) => !existingAppleId || existingAppleId === appleId;

// OTP / password-register: any existing row with this inbox is the account.
export const existingAccountForEmail = <T>(
  local: T | null,
  anyProvider: T | null,
): T | null => local ?? anyProvider;

export const shouldBlockLocalRegister = (anyProvider: unknown) => !!anyProvider;

/** Google and Apple already proved the inbox. Do not ask for a company name. */
export const shouldCompleteOauthWithoutOrgForm = (provider: string) =>
  provider === 'GOOGLE' || provider === 'APPLE';

export const oauthWorkspaceName = (email: string) => {
  const prefix = email.split('@')[0] || '';
  return prefix.length >= 3 ? prefix.slice(0, 64) : 'Workspace';
};

export async function linkLocalGoogleAccount<T extends LinkableUser>(
  local: T,
  googleId: string,
  users: OauthUserStore<T>,
): Promise<T> {
  if (shouldAttachGoogleId(local.providerId, googleId)) {
    await users.attachProviderId(local.id, googleId);
    local.providerId = googleId;
  }

  // Same as OTP: proving the inbox activates a LOCAL account waiting on email.
  if (!local.activated) {
    await users.activateUser(local.id);
    local.activated = true;
  }

  return local;
}

export async function linkLocalAppleAccount<T extends LinkableUser>(
  local: T,
  appleId: string,
  users: OauthUserStore<T>,
): Promise<T> {
  if (
    shouldAttachAppleId(local.appleProviderId, appleId) &&
    users.attachAppleProviderId
  ) {
    await users.attachAppleProviderId(local.id, appleId);
    local.appleProviderId = appleId;
  }

  if (!local.activated) {
    await users.activateUser(local.id);
    local.activated = true;
  }

  return local;
}

export async function findExistingOauthUser<T extends LinkableUser>(
  provider: string,
  identity: OauthIdentity,
  users: OauthUserStore<T>,
): Promise<T | null> {
  // Email-first: a leftover GOOGLE/APPLE row must not win over LOCAL with the
  // same inbox. That is the duplicate this product must not keep creating.
  if (shouldLinkOauthToLocalEmail(provider, identity.email)) {
    const local = await users.getUserByEmail(identity.email!);
    if (local) {
      if (provider === 'APPLE') {
        return linkLocalAppleAccount(local, identity.id, users);
      }
      return linkLocalGoogleAccount(local, identity.id, users);
    }
  }

  return users.getUserByProvider(identity.id, provider);
}
