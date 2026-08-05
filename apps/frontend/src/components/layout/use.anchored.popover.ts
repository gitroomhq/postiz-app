'use client';

import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
  type Placement,
} from '@floating-ui/dom';
import { useLayoutEffect, useRef, type RefObject } from 'react';

export type PopoverAlign = 'start' | 'end';

/**
 * Viewport-aware popover positioning (flip + shift), shared by header/toolbar
 * menus that used to hard-code `absolute start-0` / `end-0` and overflow the
 * right edge. Uses `@floating-ui/dom` — same stack as the mention suggestion
 * list. `start`/`end` placements follow `dir` for RTL.
 */
export function useAnchoredPopover<
  R extends HTMLElement = HTMLElement,
  F extends HTMLElement = HTMLElement
>(
  open: boolean,
  align: PopoverAlign = 'start',
  options?: {
    /** Gap between anchor and panel. Default 6. */
    offsetPx?: number;
    /**
     * Skid along the cross axis (LTR: +x for bottom placements). Default 0.
     * flip/shift still run after this — near-edge behaviour is unchanged.
     */
    crossAxisPx?: number;
    /** Viewport padding for flip/shift. Default 8. */
    padding?: number;
    /** Override Floating UI placement (defaults from `align`). */
    placement?: Placement;
  }
): {
  referenceRef: RefObject<R | null>;
  floatingRef: RefObject<F | null>;
} {
  const referenceRef = useRef<R | null>(null);
  const floatingRef = useRef<F | null>(null);
  const offsetPx = options?.offsetPx ?? 6;
  const crossAxisPx = options?.crossAxisPx ?? 0;
  const padding = options?.padding ?? 8;
  const placement: Placement =
    options?.placement ?? (align === 'end' ? 'bottom-end' : 'bottom-start');

  useLayoutEffect(() => {
    const reference = referenceRef.current;
    const floating = floatingRef.current;
    if (!open || !reference || !floating) {
      return;
    }

    floating.style.visibility = 'hidden';

    const update = () => {
      computePosition(reference, floating, {
        placement,
        strategy: 'fixed',
        middleware: [
          offset({ mainAxis: offsetPx, crossAxis: crossAxisPx }),
          flip({ padding }),
          shift({ padding }),
          size({
            padding,
            apply({
              availableWidth,
              elements,
            }: {
              availableWidth: number;
              elements: { floating: HTMLElement };
            }) {
              elements.floating.style.maxWidth = `${Math.max(
                0,
                availableWidth
              )}px`;
            },
          }),
        ],
      }).then(({ x, y, strategy }) => {
        Object.assign(floating.style, {
          position: strategy,
          left: `${x}px`,
          top: `${y}px`,
          right: 'auto',
          bottom: 'auto',
          margin: '0',
          visibility: 'visible',
        });
      });
    };

    return autoUpdate(reference, floating, update);
  }, [open, placement, offsetPx, crossAxisPx, padding]);

  return { referenceRef, floatingRef };
}
