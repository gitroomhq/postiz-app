'use client';

import { FC, ReactNode, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

/**
 * Stripe Customer Portal: card on file, tax IDs, invoices and receipts.
 *
 * Founding members are one-time payers, not a recurring Stripe subscription,
 * but they still have a Stripe customer after checkout. The portal is how they
 * update the card and download the founding receipt. Hiding this row because
 * there is no package-claim form (or because Settings used to say "no invoices")
 * leaves Billing with no payment-method surface.
 */
export const BillingPortalRow: FC<{
  lifetime?: boolean;
  extra?: ReactNode;
}> = ({ lifetime, extra }) => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const [busy, setBusy] = useState(false);

  const openPortal = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch('/billing/portal');
      const { portal } = response?.ok
        ? await response.json().catch(() => ({} as { portal?: string }))
        : ({} as { portal?: string });

      if (!portal) {
        toast.show(
          t(
            'billing_portal_failed',
            'We could not open the billing portal, please try again'
          ),
          'warning'
        );
        return;
      }

      window.location.href = portal;
    } finally {
      setBusy(false);
    }
  }, [fetch, t, toast]);

  return (
    <div
      data-billing-portal-row="1"
      className="flex flex-wrap items-center gap-[12px] rounded-[14px] bg-pqInner p-[16px_18px] outline outline-1 -outline-offset-1 outline-pqBorder"
    >
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-[600] text-pqText">
          {t('portal_row_title', 'Payment method & invoices')}
        </div>
        <div className="mt-[2px] text-[12.5px] text-pqMuted">
          {t(
            'portal_row_sub',
            'Update your card, tax IDs, or download invoices and receipts.'
          )}
        </div>
        {lifetime && (
          <div
            data-invoices-empty="lifetime"
            className="mt-[6px] text-[12.5px] text-pqSoft"
          >
            {t(
              'invoices_none_lifetime',
              'No recurring invoices. Receipts for the one-time founding payment are in the billing portal.'
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        data-billing-portal="1"
        disabled={busy}
        onClick={openPortal}
        className="h-[38px] rounded-[10px] bg-pqSettings px-[15px] text-[13px] font-[600] text-pqText transition-shadow hover:shadow-[inset_0_0_0_999px_var(--hover)] disabled:opacity-60"
      >
        {busy
          ? t('billing_redirecting', 'Redirecting…')
          : t('open_billing_portal', 'Open billing portal')}
      </button>
      {extra}
    </div>
  );
};
