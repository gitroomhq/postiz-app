'use client';

import { FC, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDecisionModal } from '@gitroom/frontend/components/layout/new-modal';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// /oauth/hubspot/callback sends people here after they install the Postiz
// app in HubSpot, and the calendar alone doesn't say what just happened
export const HubspotInstalled: FC = () => {
  const installed = useSearchParams().get('hubspot') === 'installed';
  const modal = useDecisionModal();
  const router = useRouter();
  const t = useT();
  const shown = useRef(false);

  useEffect(() => {
    if (!installed || shown.current) {
      return;
    }
    shown.current = true;
    (async () => {
      await modal.open({
        title: t('hubspot_installed', 'Postiz is installed in HubSpot'),
        onlyApprove: true,
        approveLabel: t('ok', 'OK'),
        description: t(
          'hubspot_installed_description',
          'Connect the channels you want to post to here in Postiz. Then, in HubSpot, open Agent Hub > Agent Builder, add a tool, pick Postiz MCP under MCP Servers and click Connect and add.'
        ),
      });
      // like Onboarding, drop the param once closed so a calendar reload
      // doesn't show it again
      router.replace('/launches');
    })();
  }, [installed]);

  return null;
};
