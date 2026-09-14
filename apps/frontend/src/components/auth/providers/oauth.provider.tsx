'use client';

import { useCallback } from 'react';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { oauthButtonClass } from '@gitroom/frontend/components/auth/oauth-button-class';
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
      className={oauthButtonClass}
    >
      <div>
        <SafeImage
          src={oauthLogoUrl || '/icons/generic-oauth.svg'}
          alt="genericOauth"
          width={40}
          height={40}
          className="-mt-[7px]"
        />
      </div>
      <div>
        {t('sign_in_with', 'Sign in with')}&nbsp;
        {oauthDisplayName || 'OAuth'}
      </div>
    </div>
  );
};
