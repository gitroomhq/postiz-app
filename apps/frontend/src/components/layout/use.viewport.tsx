'use client';

import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

/**
 * The redesign's breakpoints.
 *
 * The design does not express its responsive behaviour in media queries. It
 * puts `data-mobile` / `data-tablet` on the app root from a single JS width and
 * keys every override off those, because most of the changes are structural
 * rather than cosmetic — the rail becomes an overlay drawer, side panels become
 * bottom sheets, the composer goes fullscreen. Those are decisions a component
 * has to make, not something CSS can express alone.
 *
 * Reproducing that mechanism is also what keeps this migration cheap: the repo
 * already has `mobile:` / `tablet:` Tailwind screens at 1025 / 1300px used in
 * 88 places. Re-cutting them to the design's 760 / 1180 would change every one
 * of those. Instead the two systems sit side by side — Tailwind's for what it
 * already styles, this for what the redesign adds.
 */
export const PQ_MOBILE_MAX = 760;
export const PQ_TABLET_MAX = 1180;

export interface Viewport {
  width: number;
  mobile: boolean;
  tablet: boolean;
  desktop: boolean;
}

const measure = (width: number): Viewport => ({
  width,
  mobile: width < PQ_MOBILE_MAX,
  tablet: width >= PQ_MOBILE_MAX && width < PQ_TABLET_MAX,
  desktop: width >= PQ_TABLET_MAX,
});

// The server has no width. The design's own fallback is 1440, and desktop is
// the layout that degrades most gracefully if the first client measurement
// disagrees.
const SSR_WIDTH = 1440;

const ViewportContext = createContext<Viewport>(measure(SSR_WIDTH));

/**
 * The first measurement has to land before the browser paints, or a phone shows
 * one frame of the desktop layout — the server renders at `SSR_WIDTH`, so the
 * 236px rail appears and then snaps to the drawer. `useLayoutEffect` runs
 * before paint but warns during SSR, where it would do nothing anyway.
 */
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * One listener for the whole app, and the only place the root attributes are
 * written. Mounted high enough that `[data-mobile="1"] …` descendant selectors
 * reach every surface, including portalled modals and drawers.
 */
export const ViewportProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [width, setWidth] = useState(SSR_WIDTH);

  useIsomorphicLayoutEffect(() => {
    // Coalesce to one update per frame: a drag-resize fires resize far faster
    // than React can usefully re-render, and every consumer of this context
    // re-renders with it.
    let frame = 0;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(window.innerWidth));
    };

    setWidth(window.innerWidth);
    window.addEventListener('resize', read);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', read);
    };
  }, []);

  const viewport = useMemo(() => measure(width), [width]);

  // Also before paint: the `[data-mobile="1"] …` rules in global.scss hide
  // header labels, and doing it after paint would flash them too.
  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-mobile', viewport.mobile ? '1' : '0');
    root.setAttribute('data-tablet', viewport.tablet ? '1' : '0');
  }, [viewport.mobile, viewport.tablet]);

  return (
    <ViewportContext.Provider value={viewport}>
      {children}
    </ViewportContext.Provider>
  );
};

export const useViewport = () => useContext(ViewportContext);
