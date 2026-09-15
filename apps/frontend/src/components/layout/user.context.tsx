'use client';

import { createContext, FC, ReactNode, useContext } from 'react';
import type { User } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import {
  AnyTier,
  pricing,
  PricingInnerInterface,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { useVariables } from '@gitroom/react/helpers/variable.context';
export const UserContext = createContext<
  | undefined
  | (User & {
      orgId: string;
      tier: PricingInnerInterface;
      publicApi: string;
      role: 'USER' | 'ADMIN' | 'SUPERADMIN';
      totalChannels: number;
      isLifetime?: boolean;
      impersonate: boolean;
      allowTrial: boolean;
      isTrailing: boolean;
      /** Deferred founding fee still owed after the trial window closed. */
      lifetimePaymentPending?: boolean;
      /** Workspace display name for the current organization. */
      orgName?: string;
      streakSince: string | null;
      /** Stripe cancel / subscription end day when known (lapsed paywall). */
      subscriptionEndedAt?: string | Date | null;
    })
>(undefined);
export const ContextWrapper: FC<{
  user: User & {
    orgId: string;
    tier: AnyTier;
    role: 'USER' | 'ADMIN' | 'SUPERADMIN';
    publicApi: string;
    totalChannels: number;
  };
  children: ReactNode;
}> = ({ user, children }) => {
  const values = user
    ? {
        ...user,
        tier: pricing[user.tier],
      }
    : ({} as any);
  return <UserContext.Provider value={values}>{children}</UserContext.Provider>;
};
export const useUser = () => useContext(UserContext);

/**
 * Whether Copilot may be mounted for this account.
 *
 * `aiEnabled` alone was not enough. It only says the installation has an
 * OpenAI key, and every AI route except `/copilot/chat` already answered 402
 * to a tier without AI — so on a billing-enabled install a FREE user reaching
 * `/agents` mounted the provider against a route that refused them, and got
 * the CombinedError the flag was introduced to prevent. Now that
 * `/copilot/chat` carries the same policy, the mount has to know about the
 * tier too.
 *
 * Both forms exist because the two provider sites sit above `ContextWrapper`
 * and hold the raw `/user/self` payload, where `tier` is still a string. Take
 * the hook anywhere inside the tree.
 *
 * With billing off, `permissions.service.ts` grants every policy, so this must
 * not withhold anything either — self-hosters have no tier to be on.
 */
export const aiAvailable = (
  user: { tier?: AnyTier } | undefined,
  aiEnabled: boolean,
  billingEnabled: boolean
) => !!aiEnabled && (!billingEnabled || !!pricing[user?.tier!]?.ai);

export const useAiAvailable = () => {
  const user = useUser();
  const { aiEnabled, billingEnabled } = useVariables();
  return !!aiEnabled && (!billingEnabled || !!user?.tier?.ai);
};
