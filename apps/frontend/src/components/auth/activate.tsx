'use client';

import { useT } from '@gitroom/react/translation/get.transation.service.client';

export function Activate() {
  const t = useT();
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold text-start mb-4 cursor-pointer">
          {t('activate_your_account', 'Activate your account')}
        </h1>
      </div>
      <div className="text-textColor">
        {t('thank_you_for_registering', 'Thank you for registering!')}
        <br />
        {t(
          'please_check_your_email_to_activate_your_account',
          'Please check your email to activate your account.'
        )}
      </div>
    </>
  );
}
