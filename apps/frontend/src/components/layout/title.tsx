'use client';

import { useMemo } from 'react';
import { useMenuItem } from '@gitroom/frontend/components/layout/top.menu';
import { useChromeLocation } from '@gitroom/frontend/components/layout/use-chrome-location';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// Routes with no menu entry (/admin/*, /err) that still deserve a heading
// rather than an empty <h1>.
const FALLBACK_TITLES: Record<string, string> = {
  '/connections': 'Connections',
  '/settings': 'Settings',
  '/billing': 'Billing',
  '/admin/stats': 'Stats',
  '/admin/errors': 'Errors',
  '/err': 'Error',
};

export const Title = () => {
  // Soft Settings/Connections overlays change the URL but keep the previous
  // page mounted — chrome must follow that background page, not the overlay.
  // Hard `/settings` / `/connections` blanks the h1 (scrim covers the header;
  // a second "Settings" label under the sheet felt dual).
  const { pathname: path, searchParams, isHardOverlay } = useChromeLocation();
  const t = useT();
  const { all: menuItems } = useMenuItem();
  const isPostsList =
    path.indexOf('/launches') === 0 && searchParams.get('display') === 'list';

  // The redesign puts a line of orientation under the page name. The repo had
  // no source for it, so these are new strings rather than lifted ones; the
  // English comes from the prototype. Only routes this app actually has are
  // listed — the prototype's map also covers screens that are Settings tabs
  // here, and inventing pages for them would be the design driving behaviour.
  const SUBTITLES: Record<string, string> = {
    '/launches': t(
      'subtitle_calendar',
      'Plan and publish across every channel'
    ),
    '/channels': t(
      'subtitle_channels',
      'Connect and manage your social accounts'
    ),
    '/agents': t(
      'subtitle_agents',
      'Draft, generate and schedule with the agent'
    ),
    '/analytics': t('subtitle_analytics', 'How your channels are performing'),
    '/media': t('subtitle_media', 'Every asset in one place'),
    '/plugs': t('subtitle_plugs', 'Automations that run after publishing'),
    '/third-party': t(
      'subtitle_integrations',
      'Extend PostQueen with other tools'
    ),
    '/settings': t(
      'subtitle_settings',
      'Workspace, publishing and developer options'
    ),
    '/billing': t('subtitle_billing', 'Plan, usage and invoices'),
    '/connections': t(
      'subtitle_connections',
      'Connect Claude, ChatGPT, MCP clients and more'
    ),
  };

  const currentTitle = useMemo(() => {
    if (isHardOverlay) return '';
    if (isPostsList) return t('posts', 'Posts');
    // More-menu items deep-link to `/settings?tab=…` and share the `/settings`
    // prefix — the chrome h1 is always Settings; tab titles live in the sheet.
    if (path.indexOf('/settings') === 0) {
      return t('settings', 'Settings');
    }
    // Skip entries with no path and entries this deployment hides. Prefer the
    // longest path match so `/launches?display=list` does not steal `/launches`
    // titles incorrectly when both appear in `all`.
    const fromMenu = menuItems
      .filter((item) => !item.hide && !!item.path && item.path.startsWith('/'))
      .filter((item) => {
        const base = item.path.split('?')[0];
        if (path.indexOf(base) === -1) return false;
        // Calendar menu path is bare `/launches` — not Posts' query variant.
        if (base === '/launches' && item.path.includes('display=list')) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          b.path.split('?')[0].length - a.path.split('?')[0].length
      )[0]?.name;
    if (fromMenu) return fromMenu;
    const fallbackKey = Object.keys(FALLBACK_TITLES).find(
      (key) => path.indexOf(key) > -1
    );
    return fallbackKey ? FALLBACK_TITLES[fallbackKey] : '';
  }, [path, menuItems, isPostsList, isHardOverlay, t]);

  const subtitle = useMemo(() => {
    if (isHardOverlay) return '';
    if (isPostsList) {
      return t(
        'subtitle_posts',
        'Everything scheduled, drafted and published'
      );
    }
    const key = Object.keys(SUBTITLES).find((k) => path.indexOf(k) === 0);
    return key ? SUBTITLES[key] : '';
  }, [path, t, isPostsList, isHardOverlay]);

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
