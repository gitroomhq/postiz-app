'use client';

import React from 'react';
import { PostQueenLogo } from '@gitroom/frontend/components/ui/logo.component';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

/**
 * Shown instead of the plan picker when the organization needs a subscription
 * but the current member is not allowed to buy one.
 *
 * Billing routes require an ADMIN/SUPERADMIN role. Without this screen a
 * regular member of an organization whose subscription lapsed would be dropped
 * onto the checkout, and every action there would fail with a bare 402 and no
 * explanation of who can fix it.
 *
 * The design draws it inside the same checkout shell: the 68px header, then a
 * centred block — 56px icon circle, 24px title, muted body.
 */
export const BillingAdminRequiredComponent = () => {
  const t = useT();

  return (
    <div
      data-pq-admin-required="1"
      className="flex min-h-0 flex-1 flex-col bg-pqBg"
    >
      <div className="flex h-[68px] shrink-0 items-center gap-[14px] border-b border-pqLine bg-pqInner px-[40px] tablet:px-[32px] mobile:!px-[16px]">
        <PostQueenLogo
          wordmark
          tileClassName="size-[34px]"
          glyphClassName="size-[19px]"
          wordClassName="text-[19px]"
        />
        <div className="flex-1" />
        <div className="flex items-center gap-[2px] text-pqMuted">
          <div className="flex h-[36px] items-center rounded-[10px] px-[8px] empty:hidden">
            <OrganizationSelector />
          </div>
          <div className="grid h-[36px] w-[36px] place-items-center rounded-[10px] transition-colors hover:bg-pqHover hover:text-pqText">
            <LogoutComponent isIcon={true} />
          </div>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-[56px_40px_120px] mobile:!px-[16px]">
        <div className="flex max-w-[520px] flex-col items-center gap-[16px] text-center">
          <span className="grid size-[56px] place-items-center rounded-full bg-pqSettings text-pqSoft">
            <svg
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className="font-display text-[24px] font-[700] tracking-[-0.02em] text-pqText">
            {t('billing_admin_required_title', 'A subscription is needed')}
          </h1>
          <p className="text-[16px] leading-[1.6] text-pqMuted">
            {t(
              'billing_admin_required_description',
              'This workspace does not have an active plan. Only an admin of the workspace can choose or renew one — please ask them to take a look.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
