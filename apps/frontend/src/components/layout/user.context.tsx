'use client';

import { createContext, FC, ReactNode, useContext, useState } from 'react';
import { User } from '@prisma/client';
import {
  pricing,
  PricingInnerInterface,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

type UserWithExtras = User & {
  orgId: string;
  tier: PricingInnerInterface;
  publicApi: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  totalChannels: number;
  isLifetime?: boolean;
  impersonate: boolean;
  allowTrial: boolean;
};

type UserContextType = UserWithExtras & {
  updateUser: (newUser: Partial<UserWithExtras>) => void;
};

export const UserContext = createContext<UserContextType | undefined>(undefined);

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
  const [userState, setUserState] = useState<UserContextType | undefined>(
    user ? { 
      ...user, 
      tier: pricing[user.tier],
      impersonate: false,
      allowTrial: true,
      isLifetime: false,
      updateUser: (newUser: Partial<UserWithExtras>) => {
        setUserState(prev => prev ? { ...prev, ...newUser } : undefined);
      }
    } : {} as any
  );

  return <UserContext.Provider value={userState}>{children}</UserContext.Provider>;
};
export const useUser = () => useContext(UserContext);
