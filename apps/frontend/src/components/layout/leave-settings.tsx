'use client';

import {
  type FC,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

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
 */
export function leaveSettingsFor(
  path: string,
  router: { push: (href: string) => void }
) {
  if (typeof document !== 'undefined') {
    const hardOverlay = document.querySelector(
      '[data-settings-scrim][data-route-mode="page"], [data-connect-scrim][data-route-mode="page"]'
    );
    if (hardOverlay) {
      window.location.assign(path);
      return;
    }
  }
  router.push(path);
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
  useEffect(() => {
    setBody(document.body);
  }, []);

  if (!body) return null;

  const dataAttrs =
    kind === 'settings'
      ? { 'data-settings-scrim': '1' as const }
      : { 'data-connect-scrim': '1' as const };

  return createPortal(
    <div
      {...dataAttrs}
      data-route-mode={mode}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-pqPopup p-[44px_24px] [@media(max-width:1180px)]:p-[20px] [@media(max-width:760px)]:p-0"
      onClick={onClose}
    >
      {children}
    </div>,
    body
  );
};
