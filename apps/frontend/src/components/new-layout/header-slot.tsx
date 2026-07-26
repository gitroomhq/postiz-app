'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A place in the header a page can put its primary action.
 *
 * The action itself cannot live in the header component. The calendar's
 * "Create Post" button reads `useCalendar()`, and CalendarWeekProvider wraps
 * only the calendar page body — which renders inside the layout's `children`,
 * below the header. Rendering the button in the header directly would throw on
 * every other page.
 *
 * So the header renders an empty container and the page portals into it: the
 * button stays mounted inside its own providers and only its output moves.
 * Pages without a primary action leave the container empty, and the header
 * collapses around it.
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
