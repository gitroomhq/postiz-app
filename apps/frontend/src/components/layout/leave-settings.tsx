'use client';

import {
  type FC,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useTourRunning } from '@gitroom/frontend/components/onboarding/tour';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';

/**
 * Leave the Settings intercepting overlay (`@modal/(.)settings`) for another
 * app route.
 *
 * Soft Settings (`routeMode=intercept`) → `router.push` replaces the `@modal`
 * slot (fast; prior page stays under the scrim).
 *
 * Hard `/settings` (or `/connections`) as `children` → soft-push to
 * `(.)connections` keeps that page mounted under the new intercept and stacks
 * two sheets. Full assign clears the parallel route (same as design
 * `goConnections`: close Settings first).
 *
 * `replace` drops the overlay URL from history, so Back from the destination
 * skips the sheet the person just left (upgrade CTA: land on `/billing`, Back
 * returns to the page from before Settings, not to the gated pane).
 */
export function leaveSettingsFor(
  path: string,
  router: { push: (href: string) => void; replace: (href: string) => void },
  { replace = false }: { replace?: boolean } = {}
) {
  if (typeof document !== 'undefined') {
    const hardOverlay = document.querySelector(
      '[data-settings-scrim][data-route-mode="page"], [data-connect-scrim][data-route-mode="page"]'
    );
    if (hardOverlay) {
      if (replace) window.location.replace(path);
      else window.location.assign(path);
      return;
    }
  }
  if (replace) router.replace(path);
  else router.push(path);
}

const OVERLAY_ROUTE = {
  settings: '/settings',
  connect: '/connections',
} as const;

/**
 * True while the URL still owns this overlay.
 *
 * A soft `router.push` away from `/settings` leaves the `@modal` slot's last
 * active state mounted — Next.js only falls back to `default.tsx` on a hard
 * load. Without this the sheet strands on top of the destination page, and its
 * scrim `onClose` (a history `back()`, not a dismiss) walks the person off that
 * page again. Matching on an exact path or a `/` boundary keeps a future
 * `/settings-something` route from re-triggering the overlay; `usePathname`
 * excludes the query string, so `?tab=…` switching is unaffected.
 */
export function useRouteOverlayActive(kind: 'settings' | 'connect') {
  const pathname = usePathname();
  const base = OVERLAY_ROUTE[kind];
  return pathname === base || !!pathname?.startsWith(`${base}/`);
}

export type RouteOverlayMode = 'page' | 'intercept';

/**
 * Settings / Connections scrim. Always portals to `document.body` so a hard
 * `/settings` load is not trapped inside `.blurMe` (header peek + crushed
 * card height). Soft intercept already sits outside AppChrome — portal keeps
 * both paths identical.
 */
export const RouteOverlayScrim: FC<{
  mode: RouteOverlayMode;
  /** `data-settings-scrim` or `data-connect-scrim` */
  kind: 'settings' | 'connect';
  onClose: () => void;
  children: ReactNode;
}> = ({ mode, kind, onClose, children }) => {
  const [body, setBody] = useState<HTMLElement | null>(null);
  const { touch } = useViewport();
  const active = useRouteOverlayActive(kind);
  // Two scrims do not read as one darker scrim, they read as a broken
  // spotlight: the tour dims the app and cuts a hole over the step's target,
  // and this one sits *under* that hole. The `connect-pq` step points at the
  // rail button with `/connections` already open, so the button people are
  // being asked to look at was the one thing still greyed out; on the step
  // after, the two scrims multiplied and left the panel at ~14% of its
  // brightness. The tour is already painting the dim — stand down while it is.
  const tourRunning = useTourRunning();
  useEffect(() => {
    setBody(document.body);
  }, []);

  // Unmounts the children too, so the sheet stops rendering and fetching once
  // the route no longer points at it.
  if (!body || !active) return null;

  const dataAttrs =
    kind === 'settings'
      ? { 'data-settings-scrim': '1' as const }
      : { 'data-connect-scrim': '1' as const };

  return createPortal(
    <div
      {...dataAttrs}
      data-route-mode={mode}
      className={clsx(
        // Above header z-40 and rail z-45 so the card is not clipped by
        // chrome. Create Post modals start at 200; sheets sit at 240.
        'fixed inset-0 z-[220] flex items-center justify-center',
        touch ? 'p-0' : 'p-[44px_24px]',
        !tourRunning && 'bg-pqPopup'
      )}
      // Dismiss-on-outside-click is right when the person opened this. During
      // the tour they did not — the step navigated here — and closing it takes
      // the step's own target away. The tour is walked with Next.
      onClick={tourRunning ? undefined : onClose}
    >
      {children}
    </div>,
    body
  );
};
