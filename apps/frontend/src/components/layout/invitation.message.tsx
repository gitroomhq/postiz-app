'use client';

import { FC, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCookie, setCookie } from 'react-use-cookie';
import { getCookieUrlFromDomain } from '@gitroom/helpers/subdomain/subdomain.management';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export const InvitationMessage: FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toaster = useToaster();
  const t = useT();
  const { frontEndUrl } = useVariables();
  const invitation = searchParams.get('invitation');

  useEffect(() => {
    // ?invitation=expired => logged-in / direct-link path (set by the proxy).
    // invitation cookie => account-creation / login path (set by the backend),
    // which survives the email-activation detour before the user lands in-app.
    const expired =
      invitation === 'expired' || getCookie('invitation') === 'expired';
    if (!expired) {
      return;
    }

    toaster.show(
      t(
        'invitation_expired',
        'Your invitation link has expired or is no longer valid. Please ask the team to send you a new one.'
      ),
      'warning'
    );

    if (invitation) {
      const url = new URL(window.location.href);
      url.searchParams.delete('invitation');
      router.replace(url.toString());
    }

    // Clear the cookie on the same domain the backend set it on, otherwise it
    // would re-trigger the toast on every page load.
    setCookie('invitation', '', {
      days: -1,
      path: '/',
      domain: getCookieUrlFromDomain(frontEndUrl),
    });
  }, [invitation]);

  return null;
};
