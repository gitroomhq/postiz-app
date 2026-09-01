'use client';

import { ReactNode } from 'react';
import {
  SettingsTab,
  useSettingsTabs,
} from '@gitroom/frontend/components/settings/use-settings-tabs';

// Wraps a settings subroute's content so a direct link to a tab the
// user's plan doesn't include renders nothing, same as it silently
// didn't render when this was a client-side tab switch instead of a
// real route - and reuses the exact same access rules the sidebar uses
// to decide whether to show the link in the first place.
export const SettingsTabGate = ({
  tab,
  children,
}: {
  tab: SettingsTab;
  children: ReactNode;
}) => {
  const { access } = useSettingsTabs();
  if (!access[tab]) {
    return null;
  }
  return <>{children}</>;
};
