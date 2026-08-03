'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useMenuItem } from '@gitroom/frontend/components/layout/top.menu';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// Routes with no menu entry (/admin/*, /err) that still deserve a heading
// rather than an empty <h1>.
const FALLBACK_TITLES: Record<string, string> = {
  '/settings': 'Settings',
  '/billing': 'Billing',
  '/admin/stats': 'Stats',
  '/admin/errors': 'Errors',
  '/err': 'Error',
};

export const Title = () => {
  const path = usePathname();
  const t = useT();
  const { all: menuItems } = useMenuItem();

  // The redesign puts a line of orientation under the page name. The repo had
  // no source for it, so these are new strings rather than lifted ones; the
  // English comes from the prototype. Only routes this app actually has are
  // listed — the prototype's map also covers screens that are Settings tabs
  // here, and inventing pages for them would be the design driving behaviour.
  // Each key stays on one line on purpose: `ui-migration-check.sh` finds
  // translation keys with a line-scoped grep, and a wrapped `t(` is a key it
  // cannot see — so it would stop protecting these the moment the file is
  // reformatted.
  // prettier-ignore
  const SUBTITLES: Record<string, string> = {
    '/launches': t('subtitle_calendar', 'Plan and publish across every channel'),
    '/agents': t('subtitle_agents', 'Draft, generate and schedule with the agent'),
    '/analytics': t('subtitle_analytics', 'How your channels are performing'),
    '/media': t('subtitle_media', 'Every asset in one place'),
    '/plugs': t('subtitle_plugs', 'Automations that run after publishing'),
    '/third-party': t('subtitle_integrations', 'Extend PostQueen with other tools'),
    '/settings': t('subtitle_settings', 'Workspace, publishing and developer options'),
    '/billing': t('subtitle_billing', 'Plan, usage and invoices'),
  };

  const currentTitle = useMemo(() => {
    // Skip entries with no path and entries this deployment hides. Affiliate
    // carries `path: affiliateUrl`, which is '' unless AFFILIATE_URL is set, and
    // every string contains '' — so it matched every route and titled the whole
    // app "Affiliate".
    const fromMenu = menuItems.find(
      (item) => !item.hide && !!item.path && path.indexOf(item.path) > -1
    )?.name;
    if (fromMenu) return fromMenu;
    const fallbackKey = Object.keys(FALLBACK_TITLES).find(
      (key) => path.indexOf(key) > -1
    );
    return fallbackKey ? FALLBACK_TITLES[fallbackKey] : '';
  }, [path, menuItems]);

  const subtitle = useMemo(() => {
    const key = Object.keys(SUBTITLES).find((k) => path.indexOf(k) === 0);
    return key ? SUBTITLES[key] : '';
  }, [path, t]);

  return (
    <>
      <h1 className="truncate font-display text-[15.5px] font-[600] -tracking-[0.015em] text-pqText">
        {currentTitle}
      </h1>
      {!!subtitle && (
        <span className="truncate text-[11.5px] text-pqSoft">{subtitle}</span>
      )}
    </>
  );
};
