'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const OauthProvider = () => {
  const fetch = useFetch();
  const { oauthLogoUrl, oauthDisplayName } = useVariables();
  const t = useT();
  const gotoLogin = useCallback(async () => {
    try {
      const response = await fetch('/auth/oauth/GENERIC');
      if (!response.ok) {
        throw new Error(
          `Login link request failed with status ${response.status}`
        );
      }
      const link = await response.text();
      window.location.href = link;
    } catch (error) {
      console.error('Failed to get generic oauth login link:', error);
    }
  }, []);
  return (
    <div
      onClick={gotoLogin}
      className="flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-[8px] rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] px-[16px] text-customColor16 shadow-[0_16px_32px_rgba(15,23,42,0.14)] transition-all hover:-translate-y-[1px] hover:shadow-[0_20px_38px_rgba(15,23,42,0.18)]"
    >
      <div>
        <Image
          src={oauthLogoUrl || '/icons/generic-oauth.svg'}
          alt="genericOauth"
          width={40}
          height={40}
          className="-mt-[7px]"
        />
      </div>
      <div className="font-[600]">
        {t('sign_in_with', 'Sign in with')}&nbsp;
        {oauthDisplayName || 'OAuth'}
      </div>
    </div>
  );
};
