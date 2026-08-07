'use client';

import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Soft-open overlays (`@modal/(.)settings`, `@modal/(.)connections`).
 * The URL changes but the previous `(site)` page stays mounted under the scrim.
 * Chrome (header title, rail active) must keep reflecting that background page —
 * not the overlay route.
 */
export function isSoftModalPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return (
    path === '/settings' ||
    path.startsWith('/settings/') ||
    path === '/connections' ||
    path.startsWith('/connections/')
  );
}

type ChromeSnapshot = {
  pathname: string;
  search: string;
};

/** Shared across Title + every MenuItem so a remount mid-overlay cannot reset. */
let frozenChrome: ChromeSnapshot | null = null;

/**
 * Pathname + searchParams for blurred chrome under Settings/Connections scrims.
 *
 * Soft-open freezes the last non-overlay location so Calendar (etc.) keeps its
 * title and rail highlight. Hard load of `/settings` or `/connections` has no
 * prior page — chrome blanks the title (scrim covers the header; showing
 * "Settings" under a Settings sheet felt dual / crushed).
 * `router.back()` restores the original page and chrome together.
 */
export function useChromeLocation(): {
  pathname: string;
  searchParams: URLSearchParams;
  routePathname: string;
  /** True when `/settings` or `/connections` is the hard page (no prior soft page). */
  isHardOverlay: boolean;
} {
  const routePathname = usePathname() ?? '';
  const routeSearchParams = useSearchParams();
  const routeSearch = routeSearchParams.toString();

  if (!isSoftModalPath(routePathname)) {
    frozenChrome = { pathname: routePathname, search: routeSearch };
  } else if (!frozenChrome || isSoftModalPath(frozenChrome.pathname)) {
    // Hard load (or first paint on an overlay URL): chrome IS this route.
    frozenChrome = { pathname: routePathname, search: routeSearch };
  }

  const isHardOverlay =
    isSoftModalPath(routePathname) &&
    !!frozenChrome &&
    isSoftModalPath(frozenChrome.pathname);

  if (isSoftModalPath(routePathname)) {
    return {
      pathname: frozenChrome.pathname,
      searchParams: new URLSearchParams(frozenChrome.search),
      routePathname,
      isHardOverlay,
    };
  }

  return {
    pathname: routePathname,
    searchParams: routeSearchParams,
    routePathname,
    isHardOverlay: false,
  };
}
