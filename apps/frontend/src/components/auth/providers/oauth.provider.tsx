import { useCallback } from 'react';
import Image from 'next/image';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import interClass from '@gitroom/react/helpers/inter.font';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export const OauthProvider = () => {
  const fetch = useFetch();
  const { oauthLogoUrl, oauthDisplayName } = useVariables();

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
      className={`cursor-pointer bg-white h-[44px] rounded-[4px] flex justify-center items-center text-customColor16 ${interClass} gap-[4px]`}
    >
      <div>
        <Image
          src={oauthLogoUrl || '/icons/generic-oauth.svg'}
          alt="genericOauth"
          width={40}
          height={40}
        />
      </div>
      <div>Sign in with {oauthDisplayName || 'OAuth'}</div>
    </div>
  );
};
