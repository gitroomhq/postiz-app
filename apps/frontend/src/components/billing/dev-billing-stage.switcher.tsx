'use client';

import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import { mutate } from 'swr';
import {
  DEV_BILLING_STATES,
  DEV_BILLING_TIERS,
  DevBillingState,
  DevBillingTier,
} from '@gitroom/frontend/components/billing/dev-billing-stage';
import { useDevBillingStage } from '@gitroom/frontend/components/billing/dev-billing-stage.provider';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { tierLabel } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

const selectClass =
  'h-[32px] rounded-[6px] border border-pqLine bg-pqInner px-[8px] text-[12px] text-pqText outline-none';

const btnClass =
  'h-[32px] rounded-[6px] bg-amber-700 px-[10px] text-[12px] font-[600] transition-colors hover:bg-amber-600 disabled:opacity-40';

export const DevBillingStageSwitcher: FC = () => {
  const {
    enabled,
    active,
    billingState,
    tier,
    setStage,
    clearOverride,
    openFirstCheckout,
    openEndTrialPreview,
  } = useDevBillingStage();
  const fetch = useFetch();
  const toaster = useToaster();
  const [addingNotification, setAddingNotification] = useState(false);

  const onStateChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setStage({
        billingState: e.target.value as DevBillingState,
        tier,
      });
    },
    [setStage, tier]
  );

  const onTierChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setStage({
        billingState,
        tier: e.target.value as DevBillingTier,
      });
    },
    [setStage, billingState]
  );

  const addTestNotification = useCallback(async () => {
    if (addingNotification) return;
    setAddingNotification(true);
    try {
      const res = await fetch('/notifications/dev-test', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to create test notification');
      }
      // Refresh badge count. Also refresh an open list session — GET /list no
      // longer advances lastRead, so this cannot wipe unread styling.
      await mutate('notifications-list');
      await mutate(
        (key) => Array.isArray(key) && key[0] === 'notifications'
      );
      toaster.show('Test notification added');
    } catch {
      toaster.show('Could not add test notification', 'warning');
    } finally {
      setAddingNotification(false);
    }
  }, [addingNotification, fetch, toaster]);

  if (!enabled) return null;

  return (
    <div
      data-dev-billing-switcher="1"
      className="flex min-h-[44px] flex-wrap items-center justify-center gap-[10px] border-b border-pqLine bg-amber-900/90 px-[12px] py-[6px] text-[12px] text-white"
    >
      <span className="whitespace-nowrap font-[600] uppercase tracking-[0.04em] text-amber-100/90">
        DEV billing preview
      </span>
      <label className="flex items-center gap-[6px]">
        <span className="text-amber-100/80">State</span>
        <select
          className={clsx(selectClass, 'min-w-[140px]')}
          value={billingState}
          onChange={onStateChange}
        >
          {DEV_BILLING_STATES.map((state) => (
            <option key={state} value={state}>
              {state === 'member_no_plan'
                ? 'member_no_plan (ask admin)'
                : state}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-[6px]">
        <span className="text-amber-100/80">Tier</span>
        <select
          className={clsx(selectClass, 'min-w-[100px]')}
          value={tier}
          onChange={onTierChange}
        >
          {DEV_BILLING_TIERS.map((t) => (
            <option key={t} value={t}>
              {tierLabel(t)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={btnClass}
        onClick={openFirstCheckout}
      >
        First checkout
      </button>
      <button
        type="button"
        className={btnClass}
        onClick={openEndTrialPreview}
      >
        End-trial preview
      </button>
      <button
        type="button"
        className={btnClass}
        onClick={addTestNotification}
        disabled={addingNotification}
        data-dev-add-test-notification="1"
      >
        {addingNotification ? 'Adding…' : 'Add test notification'}
      </button>
      <button
        type="button"
        className="h-[32px] rounded-[6px] border border-amber-500/60 px-[10px] text-[12px] font-[600] text-amber-100 transition-colors hover:bg-amber-800 disabled:opacity-40"
        onClick={clearOverride}
        disabled={!active}
      >
        Clear
      </button>
      <span className="text-[11px] text-amber-100/70">
        LOOK only — no Stripe/DB writes. Pay still opens real checkout. Test
        notification writes a real DB row.
      </span>
    </div>
  );
};
