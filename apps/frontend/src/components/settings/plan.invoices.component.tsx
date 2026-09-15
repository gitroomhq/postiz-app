'use client';

import { FC, useCallback, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { pricing, tierLabel } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

/**
 * Settings → Plan & invoices.
 *
 * The design names this tab; it did not exist here. Invoice history and the
 * card on file live in Stripe's billing portal (`GET /billing/portal`), the
 * same surface Billing uses. Founding members have no *recurring* invoices,
 * but they still have a Stripe customer after the one-time payment — so they
 * get the portal too (receipts, card, tax IDs), plus an empty-state line.
 *
 * `GET /billing/charges` is deliberately *not* used: it is superadmin-only
 * (`billing.controller.ts:189`), so a tab built on it would answer 400 for
 * every ordinary user.
 */
export const PlanInvoicesComponent: FC = () => {
  const t = useT();
  const user = useUser();
  const fetch = useFetch();
  const toast = useToaster();
  const [busy, setBusy] = useState(false);

  const tier = user?.tier?.current || 'FREE';
  const plan = pricing[tier];
  const lifetime = !!user?.isLifetime;

  const openPortal = useCallback(async () => {
    setBusy(true);
    try {
      const { portal } = await (await fetch('/billing/portal')).json();
      if (portal) {
        window.location.href = portal;
        return;
      }
      toast.show(t('something_went_wrong', 'Something went wrong'), 'warning');
    } finally {
      setBusy(false);
    }
  }, [fetch, t, toast]);

  return (
    <div data-plan-invoices="1" className="mt-[18px] flex flex-col gap-[10px]">
      <div className="flex flex-col gap-[6px] rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="text-[11px] font-[700] uppercase tracking-[0.06em] text-pqMuted">
          {t('current_plan', 'Current plan')}
        </div>
        <div className="font-display text-[24px] font-[600] -tracking-[0.015em]">
          {tierLabel(tier)}
        </div>
        <div className="text-[13.5px] leading-[1.55] text-pqMuted">
          {lifetime
            ? t(
                'plan_lifetime_note',
                'One payment, done. Nothing renews and nothing is billed again.'
              )
            : t('plan_n_channels', '{{count}} channels', {
                count: plan?.channel ?? 0,
              })}
        </div>
      </div>

      <div className="flex flex-col items-start gap-[10px] rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="text-[13.5px] leading-[1.55] text-pqMuted">
          {lifetime
            ? t(
                'invoices_none_lifetime',
                'No recurring invoices. Receipts for the one-time founding payment are in the billing portal.'
              )
            : t(
                'invoices_live_in_portal',
                'Invoices, receipts and your payment method live in the billing portal.'
              )}
        </div>
        <div className="flex flex-wrap items-center gap-[8px]">
          <button
            type="button"
            data-plan-invoices-link="portal"
            disabled={busy}
            onClick={openPortal}
            className="rounded-pqSm bg-pqBtnSimple px-[14px] py-[9px] text-[13px] font-[600] text-pqText transition-colors hover:bg-pqHover disabled:opacity-60"
          >
            {t('open_billing_portal', 'Open billing portal')}
          </button>
          {lifetime && (
            <Link
              href="/billing/lifetime"
              data-plan-invoices-link="lifetime"
              className="rounded-pqSm bg-pqBtnSimple px-[14px] py-[9px] text-[13px] font-[600] text-pqText transition-colors hover:bg-pqHover"
            >
              {t('view_founding_membership', 'View your founding membership')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
