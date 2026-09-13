'use client';

import { useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
export const AppleProvider = () => {
  const fetch = useFetch();
  const t = useT();
  const toaster = useToaster();
  // Same guard as google.provider.tsx: customFetch resolves on 4xx/5xx, so an
  // unchecked `.text()` would send the browser to the error JSON as a path.
  const gotoLogin = useCallback(async () => {
    try {
      const response = await fetch('/auth/oauth/APPLE');
      const link = response.ok ? (await response.text()).trim() : '';
      if (!link.startsWith('http')) {
        throw new Error('Invalid OAuth link');
      }
      window.location.href = link;
    } catch (e) {
      toaster.show(
        t('oauth_start_failed', 'Could not start sign-in, please try again'),
        'warning'
      );
    }
  }, [fetch, toaster, t]);
  return (
    <button
      type="button"
      onClick={gotoLogin}
      aria-label={t('continue_with_apple', 'Continue with Apple')}
      className="cursor-pointer w-full bg-white border border-newBorder hover:bg-boxHover transition-colors h-[52px] rounded-[10px] flex justify-center items-center text-[#0E0E0E] gap-[10px] text-[15px] font-[500]"
    >
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="21px"
          height="21px"
        >
          <path
            fill="currentColor"
            d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
          />
        </svg>
      </div>
      <div>{t('continue_with_apple', 'Continue with Apple')}</div>
    </button>
  );
};
