'use client';

import { FC, useCallback } from 'react';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { BillingHistory } from '@gitroom/frontend/components/billing/billing.history.component';

export const InvoicesComponent: FC = () => {
  const { billingEnabled, isGeneral } = useVariables();
  const { openModal } = useModals();
  const user = useUser();
  const t = useT();

  const handleClick = useCallback(() => {
    openModal({
      title: t('billing_history', 'Billing History'),
      size: '1000px',
      children: <BillingHistory modal={true} />,
    });
  }, []);

  if (!billingEnabled || !isGeneral || user?.role === 'USER') {
    return null;
  }

  return (
    <div
      className="hover:text-newTextColor cursor-pointer"
      data-tooltip-id="tooltip"
      data-tooltip-content={t('billing_history', 'Billing History')}
      onClick={handleClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </svg>
    </div>
  );
};
