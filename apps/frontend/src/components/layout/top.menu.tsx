'use client';

import { FC, ReactNode, useCallback } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface MenuItemInterface {
  name: string;
  icon: ReactNode;
  path: string;
  role?: string[];
  hide?: boolean;
  requireBilling?: boolean;
  /**
   * The rail used to hide its whole first list behind one `user?.orgId` check.
   * Now that Affiliate — which was never behind it — sits in the same group,
   * the check has to travel with the items that always had it.
   */
  requireOrg?: boolean;
  onClick?: () => void;
}

/**
 * Every nav icon is drawn the same way in the redesign: one 18px icon on a 24
 * viewBox, up to two stroked paths, 1.7 stroke. Keeping them in that shape lets
 * the rail size and dim them in one place instead of each icon arriving at its
 * own dimensions, which is what made the old 80px rail's labels overflow.
 */
const NavIcon: FC<{ d: string; d2?: string }> = ({ d, d2 }) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    className="block shrink-0"
    aria-hidden="true"
  >
    <path
      d={d}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {!!d2 && (
      <path
        d={d2}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

export const useMenuItem = () => {
  const { isGeneral, affiliateUrl } = useVariables();
  const t = useT();

  // The design's first nav group carries no heading.
  const mainMenu = [
    {
      name: isGeneral ? t('calendar', 'Calendar') : t('launches', 'Launches'),
      icon: (
        <NavIcon
          d="M8 2.5v4M16 2.5v4M3.5 10h17"
          d2="M5.5 5.5h13a2.5 2.5 0 0 1 2.5 2.5v10.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5V8a2.5 2.5 0 0 1 2.5-2.5Z"
        />
      ),
      path: '/launches',
      requireOrg: true,
    },
    {
      // The design has a Posts entry beside the calendar. It opens the same
      // data as the panel, in the list view we already have — a second page
      // would be a third rendering of one endpoint.
      name: t('posts', 'Posts'),
      icon: <NavIcon d="M4.5 5.5h15M4.5 12h15M4.5 18.5h9" />,
      path: '/launches?display=list',
      requireOrg: true,
    },
    {
      name: t('ai_copilot', 'AI Copilot'),
      icon: (
        <NavIcon
          d="M12 3.5l1.7 4.3 4.3 1.7-4.3 1.7L12 15.5l-1.7-4.3L6 9.5l4.3-1.7L12 3.5Z"
          d2="M18.3 15.2l.75 1.95 1.95.75-1.95.75-.75 1.95-.75-1.95-1.95-.75 1.95-.75.75-1.95Z"
        />
      ),
      path: '/agents',
      requireOrg: true,
    },
    {
      // The design puts Channels in the rail rather than only as a column on
      // the calendar. Both stay: the column is for picking who a post goes to,
      // the page is for managing the channel itself.
      name: t('channels', 'Channels'),
      icon: (
        <NavIcon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM15.5 12v1.75a2.25 2.25 0 0 0 4.5 0V12" />
      ),
      path: '/channels',
      requireOrg: true,
    },
    {
      name: t('analytics', 'Analytics'),
      icon: (
        <NavIcon
          d="M4 19.5V4.5M4 19.5h16"
          d2="M7.5 15.5l3.6-4.2 3 2.6 4.4-6.4M18.5 7.5h-2.6M18.5 7.5v2.6"
        />
      ),
      path: '/analytics',
      requireOrg: true,
    },
    {
      name: t('media', 'Media'),
      icon: (
        <NavIcon
          d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
          d2="M3.5 16.5 8 12l3 2.7 3.5-3.7 6 6M9.4 9.6a1.3 1.3 0 1 1-2.6 0 1.3 1.3 0 0 1 2.6 0Z"
        />
      ),
      path: '/media',
      requireOrg: true,
    },
  ] satisfies MenuItemInterface[] as MenuItemInterface[];

  // The design's second group, headed "More". Its own contents there are
  // shortcuts to Settings tabs, which are not pages in this repo — so this is
  // where the two entries the design's rail has no room for live instead.
  const moreMenu = [
    // The design surfaces these four in the rail. They are Settings tabs here
    // and stay Settings tabs — the rail deep-links to the same place rather
    // than growing four routes that render what `?tab=` already renders.
    {
      name: t('social_sets', 'Social Sets'),
      icon: (
        <NavIcon d="M4 7.5h16M4 12h16M4 16.5h10" d2="M17.5 15v6M14.5 18h6" />
      ),
      path: '/settings?tab=sets',
      requireOrg: true,
    },
    {
      name: t('signatures', 'Signatures'),
      icon: (
        <NavIcon d="M3 18.5c4-1 5.5-13 8.5-13s1.5 11 4 11c1.5 0 2.5-2 5.5-2" />
      ),
      path: '/settings?tab=signatures',
      requireOrg: true,
    },
    {
      name: t('auto_post', 'Auto Post'),
      icon: (
        <NavIcon d="M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 5a14 14 0 0 1 14 14M5 10.5A8.5 8.5 0 0 1 13.5 19" />
      ),
      path: '/settings?tab=autopost',
      requireOrg: true,
    },
    {
      name: t('webhooks_1', 'Webhooks'),
      icon: (
        <NavIcon d="M9 11.5 6.5 16a3.5 3.5 0 1 0 3 5M15 11.5 17.5 16a3.5 3.5 0 1 1-3 5M12 8.5A3.5 3.5 0 1 0 9 3.2" />
      ),
      path: '/settings?tab=webhooks',
      requireOrg: true,
    },
    {
      name: t('integrations', 'Integrations'),
      icon: (
        <NavIcon
          d="M4.5 4.5h6v6h-6v-6ZM13.5 4.5h6v6h-6v-6Z"
          d2="M4.5 13.5h6v6h-6v-6ZM13.5 13.5h6v6h-6v-6Z"
        />
      ),
      path: '/third-party',
      requireOrg: true,
    },
  ] satisfies MenuItemInterface[] as MenuItemInterface[];

  // Capabilities the design's rail does not draw. They are not deleted — the
  // Settings sub-nav renders them as link rows, and `Title` still names their
  // pages from `all`. Connections needs no entry at all: the rail's primary
  // button and the Developers tab both open it.
  const extraMenu = [
    {
      name: t('plugs', 'Plugs'),
      icon: <NavIcon d="M13.2 2.5 5 13.6h6.2l-1 7.9 8.2-11.3h-6.1l1-7.7Z" />,
      path: '/plugs',
      requireOrg: true,
    },
    {
      name: t('affiliate', 'Affiliate'),
      // The design has no affiliate glyph, so this is its "invite people" icon:
      // same vocabulary, and referring someone is what the link does.
      icon: (
        <NavIcon
          d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
          d2="M19 8v6M22 11h-6"
        />
      ),
      // An affiliate programme belongs to whoever runs the install, so this is
      // hidden unless one is configured — it used to point at the vendor's
      // programme, sending every self-hosted deployment's users there. Read from
      // context, not process.env: NEXT_PUBLIC_* is inlined at image build time
      // and a client component would never see what the operator configured.
      path: affiliateUrl,
      hide: !affiliateUrl,
      role: ['ADMIN', 'SUPERADMIN', 'USER'],
      requireBilling: true,
    },
  ] satisfies MenuItemInterface[] as MenuItemInterface[];

  // The rail footer. Billing is not drawn as a nav row any more — it is the
  // upgrade row at the bottom of the rail — but it keeps its entry so `Title`
  // can still name the page and its gate stays defined in one place.
  const secondMenu = [
    {
      name: t('billing', 'Billing'),
      icon: (
        <NavIcon
          d="M3 9.5h18M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
          d2="M6.5 14h3"
        />
      ),
      path: '/billing',
      role: ['ADMIN', 'SUPERADMIN'],
      requireBilling: true,
    },
    {
      name: t('settings', 'Settings'),
      icon: (
        <NavIcon
          d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
          d2="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        />
      ),
      path: '/settings',
      role: ['ADMIN', 'USER', 'SUPERADMIN'],
    },
  ] satisfies MenuItemInterface[] as MenuItemInterface[];

  return {
    all: [...mainMenu, ...moreMenu, ...extraMenu, ...secondMenu],
    mainMenu,
    moreMenu,
    extraMenu,
    secondMenu,
  };
};

/**
 * The per-item gate, unchanged from when the rail rendered two flat lists.
 *
 * Two quirks are deliberate. `f.name === 'Billing'` compares the *translated*
 * label, so the lifetime exclusion only fires in English — that is how it
 * shipped and fixing it is a behaviour change, not a restyle. And `user.tier`
 * is a `PricingInnerInterface` object (`user.context.tsx:13`), so the
 * `!== 'FREE'` comparison below is always true at runtime; the real FREE gate
 * is the takeover in `layout.component.tsx`.
 */
export const useMenuFilter = () => {
  const user = useUser();
  const { isGeneral, billingEnabled } = useVariables();

  const orgReady =
    // @ts-ignore
    !!user?.orgId && (user.tier !== 'FREE' || !isGeneral || !billingEnabled);

  return useCallback(
    (f: MenuItemInterface) => {
      if (f.hide) {
        return false;
      }
      if (f.requireOrg && !orgReady) {
        return false;
      }
      if (f.requireBilling && !billingEnabled) {
        return false;
      }
      if (f.name === 'Billing' && user?.isLifetime) {
        return false;
      }
      if (f.role) {
        return f.role.includes(user?.role!);
      }
      return true;
    },
    [orgReady, billingEnabled, user?.isLifetime, user?.role]
  );
};
