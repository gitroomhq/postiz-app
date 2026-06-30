'use client';

import React, { useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

/**
 * Interim Client landing (Phase 2A).
 *
 * Clients are fully locked down on the backend (default-deny RolesGuard). Until
 * the dedicated Client Workspace + Approval Portal ships in Phase 2B, a signed-in
 * client sees this branded placeholder instead of the manager UI.
 */
export const ClientWorkspacePlaceholder = () => {
  const fetch = useFetch();
  const t = useT();

  const logout = useCallback(async () => {
    await fetch('/user/logout', { method: 'POST' });
    window.location.href = '/auth/login';
  }, []);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center gap-[24px] p-[24px] text-center text-newTextColor">
      <div className="scale-[1.4]">
        <Logo />
      </div>
      <h1 className="text-[28px] font-[600]">
        {t('client_welcome_title', 'Welcome to your workspace')}
      </h1>
      <p className="max-w-[460px] text-[15px] opacity-80 leading-[1.6]">
        {t(
          'client_welcome_body',
          'Your manager is setting things up. Soon you’ll be able to review scheduled posts, approve content and leave comments right here.'
        )}
      </p>
      <button
        onClick={logout}
        className="mt-[8px] h-[44px] px-[24px] rounded-[10px] bg-newBgColorInner border border-newTableBorder hover:opacity-80"
      >
        {t('sign_out', 'Sign Out')}
      </button>
    </div>
  );
};
