'use client';

import { createContext, FC, ReactNode, useContext, useEffect } from 'react';
import { User } from '@prisma/client';
import {
  pricing,
  PricingInnerInterface,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { setSentryUserContext } from '@gitroom/react/sentry/sentry.user.context';
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
    })
>(undefined);
export const ContextWrapper: FC<{
  user: User & {
    orgId: string;
    tier: 'FREE' | 'STANDARD' | 'PRO' | 'ULTIMATE' | 'TEAM';
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

  // Set Sentry user context when user changes
  useEffect(() => {
    if (user?.id) {
      setSentryUserContext(user, user.orgId);
    }
  }, [user?.id, user?.orgId]);

  return <UserContext.Provider value={values}>{children}</UserContext.Provider>;
};
export const useUser = () => useContext(UserContext);
