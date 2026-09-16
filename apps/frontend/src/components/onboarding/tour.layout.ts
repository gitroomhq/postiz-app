/**
 * Tour overlay geometry. Kept free of React so Node tests can lock desktop,
 * tablet and phone placement without loading the overlay component.
 *
 * Phone cutoff matches `PQ_MOBILE_MAX` (760): the rail is a drawer, and there
 * is never 320px free beside a target.
 */

export interface TourRect {
  /** The target's own corner radius, so the ring can trace it. */
  radius?: number;
  t: number;
  l: number;
  w: number;
  h: number;
}

export const TOUR_CARD_MAX_W = 320;
export const TOUR_CARD_H = 196;
export const TOUR_MARGIN = 16;
/** Same cutoff as `PQ_MOBILE_MAX` in `use.viewport.tsx`. */
export const TOUR_MOBILE_MAX = 760;
/**
 * Phone only. Featured and Add Channel are tall 1-column stacks there, so
 * the ring takes the visible top slice instead of the whole screen. Desktop
 * keeps the measured pane — Add a channel used to look cut in half because
 * this cap ran on every viewport.
 */
export const TOUR_TALL_MAX_VH = 0.42;

export const tourCardWidth = (vw: number) =>
  Math.min(TOUR_CARD_MAX_W, Math.max(0, vw - 2 * TOUR_MARGIN));

export const isMobileTour = (vw: number) => vw < TOUR_MOBILE_MAX;

export const clampTourPos = (
  l: number,
  t: number,
  vw: number,
  vh: number,
  cardW: number,
  cardH: number = TOUR_CARD_H
) => {
  const maxL = Math.max(TOUR_MARGIN, vw - cardW - TOUR_MARGIN);
  const maxT = Math.max(TOUR_MARGIN, vh - cardH - TOUR_MARGIN);
  return {
    l: Math.min(Math.max(TOUR_MARGIN, l), maxL),
    t: Math.min(Math.max(TOUR_MARGIN, t), maxT),
  };
};

/**
 * Intersect the measured target with the viewport. On a phone, cap Featured
 * / Add Channel so a 1-column stack cannot own the whole screen. Desktop
 * rings the visible pane in full.
 */
export const clipSpotlight = (
  r: TourRect,
  key: string,
  vw: number,
  vh: number
): TourRect => {
  const pad = 8;
  const top = Math.max(r.t, pad);
  const left = Math.max(r.l, pad);
  const bottom = Math.min(r.t + r.h, vh - pad);
  const right = Math.min(r.l + r.w, vw - pad);
  const t = top;
  const l = left;
  const w = Math.max(0, right - left);
  let h = Math.max(0, bottom - top);
  if (
    isMobileTour(vw) &&
    (key === 'connect-featured' || key === 'platform-grid') &&
    h > vh * TOUR_TALL_MAX_VH
  ) {
    h = vh * TOUR_TALL_MAX_VH;
  }
  return { ...r, t, l, w, h };
};

export const tourIsHuge = (
  rect: TourRect | null,
  key: string,
  dim: boolean | undefined,
  vw: number,
  vh: number
) => {
  if (!rect) return false;
  if (
    key === 'platform-grid' ||
    key === 'connect-featured' ||
    key === 'connect-creds'
  ) {
    return false;
  }
  const offscreen =
    rect.w < 4 ||
    rect.h < 4 ||
    rect.l + rect.w < 8 ||
    rect.l > vw - 8 ||
    rect.t > vh - 8 ||
    rect.t + rect.h < 8;
  const covers = (rect.w * rect.h) / (vw * vh) > 0.82;
  return offscreen || covers || !!dim;
};

/**
 * Where the card goes relative to the target.
 *
 * On a phone the card docks to the bottom (or the top when the target sits in
 * the lower half). Desktop / tablet keep the prototype's beside-or-below rules.
 */
export const placeTourCard = (
  r: TourRect,
  huge: boolean,
  key: string,
  vw: number,
  vh: number,
  rtl: boolean,
  cardH: number = TOUR_CARD_H
) => {
  const cardW = tourCardWidth(vw);
  const MARGIN = TOUR_MARGIN;

  if (isMobileTour(vw) && !huge) {
    const l = (vw - cardW) / 2;
    const targetMid = r.t + r.h / 2;
    // Key strip and Featured live at the top of the hub; Posts and Add
    // Channel fill the screen. Dock the card to the opposite edge so the
    // spotlight is not sitting under the copy.
    let t: number;
    if (
      key === 'posts-panel' ||
      key === 'platform-grid' ||
      key === 'nav-channels'
    ) {
      t = MARGIN;
    } else if (
      key === 'connect-creds' ||
      key === 'connect-featured' ||
      key === 'connect-pq' ||
      key === 'cal-grid'
    ) {
      t = vh - cardH - MARGIN;
    } else {
      t = targetMid > vh * 0.55 ? MARGIN : vh - cardH - MARGIN;
    }
    return clampTourPos(l, t, vw, vh, cardW, cardH);
  }

  let l: number;
  let t: number;

  if (huge) {
    l = r.l + r.w / 2 - cardW / 2;
    t = r.t + r.h / 2 - cardH / 2;
  } else if (r.w > 340 && r.h > 240) {
    if (key === 'cal-grid') {
      const inset = 16;
      l = rtl ? r.l + r.w - cardW - inset : r.l + inset;
      t = r.t + r.h - cardH - inset;
    } else if (key === 'connect-featured') {
      const inset = 16;
      l = rtl ? r.l + inset : r.l + r.w - cardW - inset;
      t = Math.min(r.t + r.h + 14, vh - cardH - MARGIN);
    } else if (key === 'platform-grid') {
      const inset = Math.min(48, r.w * 0.08);
      l = rtl ? r.l + r.w - cardW - inset : r.l + inset;
      t = r.t + Math.min(Math.max(r.h * 0.26, 140), r.h * 0.4) - cardH / 4;
    } else if (
      rtl
        ? r.l - MARGIN - cardW >= MARGIN
        : r.l + r.w + MARGIN + cardW <= vw - MARGIN
    ) {
      l = rtl ? r.l - cardW - MARGIN : r.l + r.w + MARGIN;
      t = r.t;
    } else if (r.t + r.h + MARGIN + cardH <= vh - MARGIN) {
      l = r.l;
      t = r.t + r.h + MARGIN;
    } else {
      l = r.l + r.w / 2 - cardW / 2;
      t = r.t + r.h / 2 - cardH / 2;
    }
  } else if (r.w < 340) {
    if (rtl) {
      l = r.l - cardW - MARGIN;
      t = r.h > 360 ? r.t + r.h / 2 - cardH / 2 : r.t + r.h / 2 - 62;
      if (l < MARGIN) l = r.l + r.w + MARGIN;
    } else {
      l = r.l + r.w + MARGIN;
      t = r.h > 360 ? r.t + r.h / 2 - cardH / 2 : r.t + r.h / 2 - 62;
      if (l + cardW > vw - MARGIN) l = r.l - cardW - MARGIN;
    }
  } else {
    l = r.l;
    t = r.t + r.h + MARGIN;
    if (t + cardH > vh - MARGIN) t = r.t - cardH - MARGIN;
  }

  return clampTourPos(l, t, vw, vh, cardW, cardH);
};

/**
 * Calendar step: sit next to the demo posts. On a phone, dock like every
 * other step — the week grid is full width and there is no beside-slot.
 */
export const placeByBand = (
  r: TourRect,
  band: TourRect,
  rtl: boolean,
  vw: number,
  vh: number,
  cardH: number = TOUR_CARD_H
) => {
  if (isMobileTour(vw)) {
    return placeTourCard(r, false, 'cal-grid', vw, vh, rtl, cardH);
  }
  const cardW = tourCardWidth(vw);
  const gap = 14;
  const under = band.t + band.h + gap;
  const beside = rtl ? band.l - cardW - gap : band.l + band.w + gap;
  let l: number;
  let t: number;

  if (under + cardH <= r.t + r.h - gap) {
    l = rtl ? band.l + band.w - cardW : band.l;
    t = under;
  } else if (
    rtl ? beside >= r.l + gap : beside + cardW <= r.l + r.w - gap
  ) {
    l = beside;
    t = band.t;
  } else {
    return null;
  }

  return clampTourPos(l, t, vw, vh, cardW, cardH);
};
