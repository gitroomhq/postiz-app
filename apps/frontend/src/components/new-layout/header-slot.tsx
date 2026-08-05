'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Optional header action portal.
 *
 * Page-level header actions that must mount under route providers (calendar
 * context for Create Post) and paint in the chrome via portal. Empty →
 * `empty:hidden` on the slot.
 */
const SLOT_ID = 'pq-header-action';

/** Rendered once, by the header. */
export const HeaderActionSlot = () => (
  <div id={SLOT_ID} className="flex items-center empty:hidden" />
);

/** Rendered by a page, anywhere inside whatever context its action needs. */
export const HeaderAction = ({ children }: { children: ReactNode }) => {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  // The slot belongs to a sibling subtree, so it only exists after the first
  // paint. State (not a ref) so finding it re-renders and the portal opens.
  useEffect(() => {
    setSlot(document.getElementById(SLOT_ID));
  }, []);

  if (!slot) return null;
  return createPortal(children, slot);
};
