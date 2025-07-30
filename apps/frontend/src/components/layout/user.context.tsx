'use client';

import { createContext, FC, ReactNode, useContext } from 'react';
import { User } from '@prisma/client';
import {
  pricing,
  PricingInnerInterface,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
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

export const UserMutateContext = createContext<(() => void) | undefined>(undefined);
export const ContextWrapper: FC<{
  user: User & {
    orgId: string;
    tier: 'FREE' | 'STANDARD' | 'PRO' | 'ULTIMATE' | 'TEAM';
    role: 'USER' | 'ADMIN' | 'SUPERADMIN';
    publicApi: string;
    totalChannels: number;
  };
  children: ReactNode;
  userMutate?: () => void;
}> = ({ user, children, userMutate }) => {
  const values = user
    ? {
        ...user,
        tier: pricing[user.tier],
      }
    : ({} as any);
  return (
    <UserContext.Provider value={values}>
      <UserMutateContext.Provider value={userMutate}>
        {children}
      </UserMutateContext.Provider>
    </UserContext.Provider>
  );
};
export const useUser = () => useContext(UserContext);
export const useUserMutate = () => useContext(UserMutateContext);
