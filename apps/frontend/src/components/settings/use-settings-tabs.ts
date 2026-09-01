'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export type SettingsTab =
  | 'global-settings'
  | 'organizations'
  | 'teams'
  | 'webhooks'
  | 'autopost'
  | 'sets'
  | 'signatures'
  | 'api'
  | 'approved-apps';

// Single source of truth for which settings subroutes exist and who can
// see them - used both by the sidebar (to render the link list) and by
// SettingsTabGate (to block direct navigation to a route the user's plan
// doesn't include), so the two can never drift out of sync.
export const useSettingsTabs = () => {
  const t = useT();
  const user = useUser();
  const { isGeneral } = useVariables();
  const url = useSearchParams();
  const showLogout = !url.get('onboarding') || user?.tier?.current === 'FREE';

  const access: Record<SettingsTab, boolean> = {
    'global-settings': true,
    organizations: true,
    teams: !!user?.tier?.team_members && isGeneral,
    webhooks: !!user?.tier?.webhooks,
    autopost: !!user?.tier?.autoPost,
    sets: user?.tier?.current !== 'FREE',
    signatures: user?.tier?.current !== 'FREE',
    api: !!user?.tier?.public_api && isGeneral && showLogout,
    'approved-apps': true,
  };

  const list = useMemo(() => {
    const arr: { tab: SettingsTab; label: string }[] = [
      { tab: 'global-settings', label: t('global_settings', 'Global Settings') },
      { tab: 'organizations', label: t('organizations', 'Organizations') },
    ];
    if (access.teams) {
      arr.push({ tab: 'teams', label: t('teams', 'Teams') });
    }
    if (access.webhooks) {
      arr.push({ tab: 'webhooks', label: t('webhooks_1', 'Webhooks') });
    }
    if (access.autopost) {
      arr.push({ tab: 'autopost', label: t('auto_post', 'Auto Post') });
    }
    if (access.sets) {
      arr.push({ tab: 'sets', label: t('sets', 'Sets') });
    }
    if (access.signatures) {
      arr.push({ tab: 'signatures', label: t('signatures', 'Signatures') });
    }
    if (access.api) {
      arr.push({ tab: 'api', label: t('developers', 'Developers') });
    }
    arr.push({ tab: 'approved-apps', label: t('approved_apps', 'Approved Apps') });
    return arr;
  }, [
    access.teams,
    access.webhooks,
    access.autopost,
    access.sets,
    access.signatures,
    access.api,
    t,
  ]);

  return { list, access, showLogout };
};
