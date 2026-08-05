'use client';

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSearchParams } from 'next/navigation';
import {
  clearDevBillingStage,
  DevBillingStageStored,
  DevBillingState,
  DevBillingSubscriptionPayload,
  DevBillingTier,
  isDevBillingStageEnabled,
  mapStageToSubscription,
  mapStageToUser,
  readDevBillingStage,
  readDevBillingStageFromUrl,
  writeDevBillingStage,
} from '@gitroom/frontend/components/billing/dev-billing-stage';

import { User } from '@prisma/client';
import { AnyTier } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

type LayoutUser = User & {
  orgId: string;
  tier: AnyTier;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  publicApi: string;
  totalChannels: number;
  isLifetime?: boolean;
  allowTrial: boolean;
  isTrailing: boolean;
  admin?: boolean;
  impersonate?: boolean;
  streakSince: string | null;
};

type DevBillingStageContextValue = {
  enabled: boolean;
  active: boolean;
  billingState: DevBillingState;
  tier: DevBillingTier;
  setStage: (stage: DevBillingStageStored) => void;
  clearOverride: () => void;
  openFirstCheckout: () => void;
  openEndTrialPreview: () => void;
  finishTrialPreviewOpen: boolean;
  closeFinishTrialPreview: () => void;
  overriddenUser: LayoutUser;
  subscriptionOverride: DevBillingSubscriptionPayload | null;
};

const DevBillingStageContext = createContext<
  DevBillingStageContextValue | undefined
>(undefined);

export const DevBillingStageProvider: FC<{
  baseUser: LayoutUser;
  children: ReactNode;
}> = ({ baseUser, children }) => {
  const searchParams = useSearchParams();
  const enabled = isDevBillingStageEnabled();
  const [stored, setStored] = useState<DevBillingStageStored | null>(() =>
    enabled ? readDevBillingStage() : null
  );
  const [finishTrialPreviewOpen, setFinishTrialPreviewOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const fromUrl = readDevBillingStageFromUrl(searchParams);
    if (fromUrl) {
      writeDevBillingStage(fromUrl);
      setStored(fromUrl);
    }
  }, [enabled, searchParams]);

  const active = enabled && stored !== null;
  const billingState = stored?.billingState ?? 'active';
  const tier = stored?.tier ?? 'PRO';

  const setStage = useCallback((stage: DevBillingStageStored) => {
    writeDevBillingStage(stage);
    setStored(stage);
  }, []);

  const clearOverride = useCallback(() => {
    clearDevBillingStage();
    setStored(null);
    setFinishTrialPreviewOpen(false);
  }, []);

  const openFirstCheckout = useCallback(() => {
    setStage({ billingState: 'not_started', tier });
  }, [setStage, tier]);

  const openEndTrialPreview = useCallback(() => {
    setStage({ billingState: 'trial', tier });
    setFinishTrialPreviewOpen(true);
  }, [setStage, tier]);

  const closeFinishTrialPreview = useCallback(() => {
    setFinishTrialPreviewOpen(false);
  }, []);

  const overriddenUser = useMemo((): LayoutUser => {
    if (!active || !stored) return baseUser;
    return mapStageToUser(baseUser, stored.billingState, stored.tier);
  }, [active, baseUser, stored]);

  const subscriptionOverride = useMemo(() => {
    if (!active || !stored) return null;
    return mapStageToSubscription(
      baseUser.orgId,
      stored.billingState,
      stored.tier
    );
  }, [active, baseUser.orgId, stored]);

  const value = useMemo(
    (): DevBillingStageContextValue => ({
      enabled,
      active,
      billingState,
      tier,
      setStage,
      clearOverride,
      openFirstCheckout,
      openEndTrialPreview,
      finishTrialPreviewOpen,
      closeFinishTrialPreview,
      overriddenUser,
      subscriptionOverride,
    }),
    [
      enabled,
      active,
      billingState,
      tier,
      setStage,
      clearOverride,
      openFirstCheckout,
      openEndTrialPreview,
      finishTrialPreviewOpen,
      closeFinishTrialPreview,
      overriddenUser,
      subscriptionOverride,
    ]
  );

  return (
    <DevBillingStageContext.Provider value={value}>
      {children}
    </DevBillingStageContext.Provider>
  );
};

export function useDevBillingStage() {
  const ctx = useContext(DevBillingStageContext);
  if (!ctx) {
    throw new Error(
      'useDevBillingStage must be used within DevBillingStageProvider'
    );
  }
  return ctx;
}

/** Safe hook for components that may mount outside the provider. */
export function useDevBillingStageOptional() {
  return useContext(DevBillingStageContext);
}
