'use client';

import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import Link from 'next/link';

export function Pending() {
  const t = useT();

  return (
    <div className="flex flex-col flex-1">
      <div>
        <h1 className="text-3xl font-bold text-start mb-4 cursor-pointer">
          {t('pending_approval_title', 'Waiting for approval')}
        </h1>
      </div>
      <div className="text-textColor">
        {t('thank_you_for_registering', 'Thank you for registering!')}
        <br />
        {t(
          'pending_approval_description',
          'An administrator has to approve your account before you can sign in. You will be able to log in as soon as that happens.'
        )}
      </div>

      <div className="mt-8 border-t border-fifth pt-6">
        <Link href="/auth/login">
          <Button className="rounded-[10px] !h-[52px] w-full">
            {t('go_to_login', 'Go to Login')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
