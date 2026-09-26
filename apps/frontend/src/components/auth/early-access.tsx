'use client';

import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// postmonster: closed access (PRD 6) - /auth/register without an invite token
export const EarlyAccess = () => {
  const t = useT();

  return (
    <div className="flex flex-col flex-1 gap-[16px]">
      <h1 className="text-[40px] font-[500] -tracking-[0.8px] text-start">
        {t('early_access_title', 'Postmonster is in Early Access')}
      </h1>
      <div className="text-[14px] opacity-80">
        {t(
          'early_access_body',
          "We're rolling out in small batches. Request access and we'll email you as soon as a spot opens up."
        )}
      </div>
      <a
        href="https://postmonster.xyz/request-access"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex"
      >
        <Button type="button" className="flex-1 rounded-[10px] !h-[52px]">
          {t('request_access', 'Request access')}
        </Button>
      </a>
      <p className="mt-2 text-sm">
        {t('already_have_an_account', 'Already Have An Account?')}&nbsp;
        <Link href="/auth/login" className="underline cursor-pointer">
          {t('sign_in', 'Sign In')}
        </Link>
      </p>
    </div>
  );
};
