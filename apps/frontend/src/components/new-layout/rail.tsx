'use client';

import {
  FC,
  MouseEvent,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { MenuItem } from '@gitroom/frontend/components/new-layout/menu-item';
import {
  useMenuFilter,
  useMenuItem,
} from '@gitroom/frontend/components/layout/top.menu';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';

interface RailProps {
  /** Desktop only. On mobile the drawer always shows labels. */
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobile: boolean;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  /** The chrome row the drawer opens over — see `drawerTop` below. */
  hostRef: RefObject<HTMLDivElement>;
}

/**
 * The left navigation.
 *
 * Three shapes, one component: 236px expanded, 60px collapsed to icons, and on
 * phones a 264px overlay drawer that slides in under the header. The drawer is
 * never rendered in icon-only mode — a 264px panel showing nothing but icons is
 * the exact bug the design's own change log records against its first attempt.
 */
export const Rail: FC<RailProps> = ({
  collapsed,
  onToggleCollapse,
  mobile,
  drawerOpen,
  onCloseDrawer,
  hostRef,
}) => {
  const t = useT();
  const user = useUser();
  const pathname = usePathname();
  const { billingEnabled } = useVariables();
  const { mainMenu, moreMenu, secondMenu } = useMenuItem();
  const filter = useMenuFilter();
  const [shut, setShut] = useState<Record<string, boolean>>({});
  /** Unpin while the pointer is still over the nav — suppress hover-expand until leave. */
  const [hovSuppressed, setHovSuppressed] = useState(false);

  const rc = collapsed && !mobile;

  /**
   * Where the drawer's top edge is, in viewport coordinates.
   *
   * It has to be viewport-anchored, not row-anchored: a page taller than the
   * window makes the chrome row grow, and a drawer stretched to that row hangs
   * its own footer — Settings, the org switcher, Upgrade — below the fold with
   * no way to reach it. That is exactly what happened on /analytics at 420.
   *
   * A hard `top: 56px` would be wrong the other way, because the impersonation
   * bar and the announcement banner both push the header down. So measure the
   * row instead, and keep measuring while the drawer is open.
   */
  const [drawerTop, setDrawerTop] = useState(0);
  useEffect(() => {
    if (!mobile || !drawerOpen) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const top = hostRef.current?.getBoundingClientRect().top ?? 0;
        setDrawerTop(Math.max(0, top));
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [mobile, drawerOpen, hostRef]);

  /**
   * The drawer looks like a dialog, so it has to behave like one for the
   * keyboard too: focus moves into it, Escape closes it, and focus goes back
   * to whatever opened it. No focus trap — the scrim and Escape are enough of
   * an exit, and trapping is a bigger change than this step should carry.
   */
  const navRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!mobile || !drawerOpen) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    navRef.current
      ?.querySelector<HTMLElement>('a[href], button:not([disabled])')
      ?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseDrawer();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      returnFocus.current?.focus?.();
    };
  }, [mobile, drawerOpen, onCloseDrawer]);

  const groups = [
    { key: 'main', label: '', items: mainMenu.filter(filter) },
    { key: 'more', label: t('more', 'More'), items: moreMenu.filter(filter) },
  ].filter((g) => g.items.length);

  const settings = secondMenu.find((f) => f.path === '/settings');
  const showSettings = !!settings && filter(settings);

  // Prototype `upgradeLabel` / icon triad: Upgrade (arrow) · Billing & invoices
  // (card, AGENCY) · Founding member (heart, lifetime / lifetime_trial). Billing
  // must be on; founding members keep the row — /billing is their lifetime
  // surface now (the old redirect away is gone).
  const showUpgrade = !!billingEnabled;
  const onBilling = pathname.indexOf('/billing') === 0;
  const isFoundingRail = !!user?.isLifetime;
  const isAgencyRail =
    !isFoundingRail && user?.tier?.current === 'AGENCY';
  const upgradeLabel = isFoundingRail
    ? t('founding_member', 'Founding member')
    : isAgencyRail
    ? t('billing_and_invoices', 'Billing & invoices')
    : t('upgrade', 'Upgrade');
  const planBadge = isFoundingRail
    ? t('lifetime_badge', 'Lifetime')
    : user?.tier?.current || '';

  // Tapping a destination should close the drawer, but not tapping the controls
  // that live inside it. The timeout lets the link's own navigation start first.
  const onRailClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (!mobile) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-keepdrawer="1"]')) return;
      setTimeout(onCloseDrawer, 40);
    },
    [mobile, onCloseDrawer]
  );

  return (
    <>
      {mobile && drawerOpen && (
        <div
          onClick={onCloseDrawer}
          style={{ top: drawerTop }}
          className="fixed inset-x-0 bottom-0 z-[72] bg-pqPopup"
        />
      )}
      {/* The parked drawer sits a full width outside the viewport, and in RTL
          that is off the *right* edge, which does widen the page. This clips
          it — the layer is inert, the rail inside it is not. */}
      <MobileLayer active={mobile} top={drawerTop}>
      {/* On desktop the nav is absolute inside a fixed-width slot, so the
          collapsed rail can widen on hover *over* the page instead of shoving
          it sideways — which is what the design's z-index:45 and drop shadow
          are for. */}
      <DesktopSlot active={!mobile} width={rc ? 60 : 236}>
      <nav
        ref={navRef}
        onClick={onRailClick}
        onMouseLeave={() => setHovSuppressed(false)}
        data-sb="1"
        data-hov={!mobile && rc && !hovSuppressed ? '1' : '0'}
        aria-label={t('main_navigation', 'Main navigation')}
        {...(mobile && drawerOpen && { role: 'dialog', 'aria-modal': true })}
        className={clsx(
          // Column fills the slot (inset-y-0) / drawer host; only the middle
          // menu scrolls. Org / Settings / Upgrade stay pinned via mt-auto.
          // Do not use h-full here for desktop — percentage height against a
          // stretch-sized slot has collapsed the scroll region to 0 before.
          'blurMe flex min-h-0 flex-col border-e border-pqRailLine bg-pqRail p-[8px] transition-[width,transform] duration-200 ease-out',
          mobile
            ? clsx(
                'pointer-events-auto absolute inset-y-0 start-0 h-full w-[264px] shadow-pqE3',
                !drawerOpen && '-translate-x-[104%] rtl:translate-x-[104%]'
              )
            : clsx(
                // Slot owns z-index (see DesktopSlot); keep the nav opaque so
                // page toolbars cannot show through the hover-expanded panel.
                'absolute inset-y-0 start-0',
                rc ? 'w-[60px]' : 'w-[236px]'
              )
        )}
      >
        {!mobile && (
          <>
            <button
              type="button"
              data-keepdrawer="1"
              data-sb-pin="1"
              onClick={() => {
                if (!rc) setHovSuppressed(true);
                onToggleCollapse();
              }}
              aria-label={
                rc
                  ? t('pin_sidebar', 'Pin sidebar')
                  : t('unpin_sidebar', 'Unpin sidebar')
              }
              className={clsx(
                'flex h-[34px] w-full shrink-0 items-center gap-[11px] rounded-pqSm px-[8px] text-[13.5px] font-[500] text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText',
                rc ? 'justify-center' : 'justify-start'
              )}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                className="shrink-0"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="16"
                  rx="2.2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path d="M9.5 4v16" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <span data-sbl="1" className="truncate">
                {rc
                  ? t('pin_sidebar', 'Pin sidebar')
                  : t('unpin_sidebar', 'Unpin sidebar')}
              </span>
            </button>
            <div className="mt-[8px] h-[1px] shrink-0 bg-pqRailLine" />
          </>
        )}

        {/* The design's most prominent rail item, and the entry point to
            everything in Connections — MCP, the agents, the API, the chat
            bridge. It deep-links to the Settings tab rather than owning a
            route, so there is one Connections and not two. */}
        <Link
          href="/connections"
          data-sb-connect="1"
          data-tour="connect-pq"
          title={t('connect_postqueen', 'Connect PostQueen')}
          className={clsx(
            'mt-[12px] flex h-[36px] shrink-0 items-center gap-[10px] rounded-pqSm bg-pqBrand px-[9px] text-[13px] font-[600] text-pqOnBrand shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)] transition-colors hover:bg-pqBrandHover',
            rc ? 'justify-center' : 'justify-start'
          )}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.2 1.2M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.2-1.2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span data-sbl="1" className="truncate">
            {t('connect_postqueen', 'Connect PostQueen')}
          </span>
        </Link>

        <div
          data-sb-scroll="1"
          className="mt-[10px] flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto overflow-x-hidden overscroll-contain"
        >
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-[1px]">
              {!!group.label && (
                <div
                  data-sbh="1"
                  className="mb-[2px] flex h-[26px] items-center rounded-pqSm pe-[4px] ps-[6px] transition-colors hover:bg-pqHover"
                >
                  <button
                    type="button"
                    data-keepdrawer="1"
                    onClick={() =>
                      setShut((s) => ({ ...s, [group.key]: !s[group.key] }))
                    }
                    aria-expanded={!shut[group.key]}
                    className="flex h-[26px] min-w-0 flex-1 items-center gap-[4px] text-start"
                  >
                    <span className="truncate text-[11px] font-[600] tracking-[0.02em] text-pqMuted">
                      {group.label}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      width="12"
                      height="12"
                      fill="none"
                      aria-hidden="true"
                      className={clsx(
                        'shrink-0 text-pqSoft transition-transform duration-150',
                        shut[group.key] && '-rotate-90 rtl:rotate-90'
                      )}
                    >
                      <path
                        d="m6 9 6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              )}
              {(!group.label || rc || !shut[group.key]) &&
                group.items.map((item) => (
                  <MenuItem
                    key={item.name}
                    path={item.path}
                    label={item.name}
                    icon={item.icon}
                    collapsed={rc}
                    onClick={item.onClick}
                    tourKey={
                      item.path === '/channels' ? 'nav-channels' : undefined
                    }
                  />
                ))}
            </div>
          ))}
        </div>

        <div
          data-sb-foot="1"
          // Pinned to the rail bottom: outside [data-sb-scroll], mt-auto +
          // shrink-0, opaque bg so page content cannot show through. Chatbase
          // must stay bottom-trailing (see chatbase.component / global.scss)
          // or it covers this block.
          className="mt-auto flex shrink-0 flex-col gap-[1px] border-t border-pqLine bg-pqRail pt-[6px]"
        >
          <OrganizationSelector variant="rail" collapsed={rc} />
          {showSettings && (
            <MenuItem
              path={settings!.path}
              label={settings!.name}
              icon={settings!.icon}
              collapsed={rc}
            />
          )}
          {showUpgrade && (
            <Link
              href="/billing"
              title={upgradeLabel}
              data-upgrade="1"
              className={clsx(
                'flex h-[34px] w-full items-center gap-[10px] rounded-[9px] px-[9px] text-[13px] font-[500] transition-colors',
                rc ? 'justify-center' : 'justify-start',
                isFoundingRail
                  ? onBilling
                    ? 'bg-pqLtRowBg text-pqLtAmber'
                    : 'text-pqLtAmber hover:bg-pqLtRowBg'
                  : isAgencyRail
                  ? onBilling
                    ? 'bg-transparent text-pqFocused'
                    : 'text-pqMuted hover:bg-pqHover hover:text-pqFocused'
                  : onBilling
                  ? 'bg-pqUpgradeHover text-pqUpgradeFgHover'
                  : 'text-pqUpgradeFg hover:bg-pqUpgradeHover hover:text-pqUpgradeFgHover'
              )}
            >
              {isFoundingRail ? (
                <svg
                  viewBox="0 0 24 24"
                  width="19"
                  height="19"
                  fill="currentColor"
                  className="shrink-0 text-pqLtAmber"
                  aria-hidden="true"
                >
                  <path d="M12 20.5 4.2 13a4.6 4.6 0 0 1 6.5-6.5l1.3 1.3 1.3-1.3A4.6 4.6 0 1 1 19.8 13L12 20.5Z" />
                </svg>
              ) : isAgencyRail ? (
                <svg
                  viewBox="0 0 24 24"
                  width="19"
                  height="19"
                  fill="none"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <path
                    d="M2.5 9.5h19M4.5 5.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="19"
                  height="19"
                  fill="none"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <path
                    d="M12 20V5M5.5 11.5 12 5l6.5 6.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span
                data-sbh="1"
                className="flex min-w-0 flex-1 items-center gap-[10px]"
              >
                <span className="min-w-0 flex-1 truncate">{upgradeLabel}</span>
                {!!planBadge && (
                  <span className="shrink-0 text-[10px] font-[700] tracking-[0.04em] text-pqSoft">
                    {planBadge}
                  </span>
                )}
              </span>
            </Link>
          )}
        </div>
      </nav>
      </DesktopSlot>
      </MobileLayer>
    </>
  );
};

/**
 * A viewport-bounded, click-through layer that exists only on phones. Off the
 * phone it renders its child unwrapped, so the desktop rail stays a plain flex
 * item in the chrome row.
 */
/** Holds the rail's place in the flex row while the nav itself floats. */
const DesktopSlot: FC<{
  active: boolean;
  width: number;
  children: ReactNode;
}> = ({ active, width, children }) => {
  if (!active) return <>{children}</>;
  // Height: self-stretch against the chrome row (items-stretch). Never h-full —
  // the slot's only child is absolutely positioned, so percentage height can
  // resolve to 0 and zero the nav; menus then clip inside overflow-y-auto while
  // the shrink-0 footer still paints (the empty-middle bug).
  // Stacking: z-45 on the *slot*, not only the nav. The page column is the next
  // flex sibling; without a z-index here, later siblings paint over the
  // hover-expanded rail (Posts "Next 3 days", calendar stickies, etc.).
  return (
    <div
      style={{ width }}
      className="relative z-[45] shrink-0 self-stretch transition-[width] duration-200 ease-out"
    >
      {children}
    </div>
  );
};

const MobileLayer: FC<{
  active: boolean;
  top: number;
  children: ReactNode;
}> = ({ active, top, children }) => {
  if (!active) return <>{children}</>;
  return (
    <div
      style={{ top }}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[78] overflow-hidden"
    >
      {children}
    </div>
  );
};
