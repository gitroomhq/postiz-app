'use client';

import React from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// postmonster: About tab in Settings (PRD 7.4)
export const AboutComponent = () => {
  const t = useT();
  const version = process.env.NEXT_PUBLIC_VERSION || '';
  const sourceCodeUrl = process.env.NEXT_PUBLIC_SOURCE_CODE_URL || '';
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';

  return (
    <div className="flex flex-col gap-[16px]">
      <h3 className="text-[20px]">{t('about', 'About')}</h3>
      <div className="text-[14px] opacity-80">
        {version
          ? t('about_version', 'Postmonster {version}').replace(
              '{version}',
              version
            )
          : 'Postmonster'}
      </div>
      <div className="text-[13px] opacity-70">
        {t(
          'about_description',
          'Early access build. All features are included, no payment required.'
        )}
      </div>
      <div className="flex flex-col gap-[10px] text-[14px]">
        {sourceCodeUrl && (
          <a
            href={sourceCodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline opacity-80 hover:opacity-100"
          >
            {t('source_code', 'Source code')}
          </a>
        )}
        <a
          href="https://postmonster.xyz/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="underline opacity-80 hover:opacity-100"
        >
          {t('terms_of_service', 'Terms of Service')}
        </a>
        <a
          href="https://postmonster.xyz/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline opacity-80 hover:opacity-100"
        >
          {t('privacy_policy', 'Privacy Policy')}
        </a>
        {supportEmail && (
          <a
            href={`mailto:${supportEmail}`}
            className="underline opacity-80 hover:opacity-100"
          >
            {t('support_email', 'Support: {email}').replace(
              '{email}',
              supportEmail
            )}
          </a>
        )}
      </div>
    </div>
  );
};
