'use client';

import React from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';

const AuthenticationComponent = () => {
  const t = useT();
  const user = useUser();

  const methods: Record<string, { label: string; showEmail: boolean }> = {
    LOCAL: {
      label: t('auth_method_local', 'Email and password'),
      showEmail: true,
    },
    GITHUB: { label: t('auth_method_github', 'GitHub'), showEmail: true },
    GOOGLE: { label: t('auth_method_google', 'Google'), showEmail: true },
    APPLE: { label: t('auth_method_apple', 'Apple'), showEmail: true },
    FARCASTER: {
      label: t('auth_method_farcaster', 'Farcaster'),
      showEmail: false,
    },
    WALLET: { label: t('auth_method_wallet', 'Wallet'), showEmail: false },
    GENERIC: {
      label: t('auth_method_generic', 'Single sign-on'),
      showEmail: false,
    },
  };

  const method = user?.providerName && methods[user.providerName];

  if (!method) {
    return null;
  }

  return (
    <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
      <div className="mt-[4px]">{t('authentication', 'Authentication')}</div>
      <div className="flex items-center justify-between gap-[24px]">
        <div className="text-[14px]">{method.label}</div>
        {method.showEmail && (
          <div className="text-[14px] text-textItemBlur">{user.email}</div>
        )}
      </div>
    </div>
  );
};

export default AuthenticationComponent;
