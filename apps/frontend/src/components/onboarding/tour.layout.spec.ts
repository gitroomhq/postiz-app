import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  TOUR_CARD_H,
  TOUR_MARGIN,
  clipSpotlight,
  placeByBand,
  placeTourCard,
  tourCardWidth,
  tourIsHuge,
} from './tour.layout.ts';

const onScreen = (
  pos: { l: number; t: number },
  vw: number,
  vh: number,
  cardW = tourCardWidth(vw),
  cardH = TOUR_CARD_H
) => {
  assert.ok(pos.l >= TOUR_MARGIN - 0.5, `left ${pos.l}`);
  assert.ok(pos.t >= TOUR_MARGIN - 0.5, `top ${pos.t}`);
  assert.ok(pos.l + cardW <= vw - TOUR_MARGIN + 0.5, `right ${pos.l + cardW} > ${vw}`);
  assert.ok(
    pos.t + cardH <= vh - TOUR_MARGIN + 0.5,
    `bottom ${pos.t + cardH} > ${vh}`
  );
};

describe('tour overlay geometry', () => {
  it('shrinks the card so a 320 CSS-pixel phone still has margins', () => {
    assert.equal(tourCardWidth(320), 288);
    assert.equal(tourCardWidth(390), 320);
    assert.equal(tourCardWidth(1440), 320);
  });

  it('docks the Connect rail step to the bottom on a phone, fully on screen', () => {
    const vw = 390;
    const vh = 844;
    const target = { t: 96, l: 12, w: 260, h: 44 };
    const pos = placeTourCard(target, false, 'connect-pq', vw, vh, false);
    onScreen(pos, vw, vh);
    assert.ok(pos.t > vh * 0.6, 'card should sit in the lower half');
    assert.ok(pos.t >= target.t + target.h, 'card should not cover Connect');
  });

  it('docks Channels to the top so the rail row stays visible', () => {
    const vw = 390;
    const vh = 844;
    const target = { t: 280, l: 12, w: 260, h: 44 };
    const pos = placeTourCard(target, false, 'nav-channels', vw, vh, false);
    onScreen(pos, vw, vh);
    assert.ok(pos.t < vh * 0.3, 'card should sit at the top');
  });

  it('clips a tall Featured stack on a phone and still places the card on screen', () => {
    const vw = 390;
    const vh = 844;
    const raw = { t: 110, l: 16, w: 358, h: 780 };
    const clipped = clipSpotlight(raw, 'connect-featured', vw, vh);
    assert.ok(clipped.h <= vh * 0.42 + 0.5);
    assert.ok(!tourIsHuge(clipped, 'connect-featured', false, vw, vh));
    const pos = placeTourCard(clipped, false, 'connect-featured', vw, vh, false);
    onScreen(pos, vw, vh);
  });

  it('clips a tall Add a channel stack on a phone the same way', () => {
    const vw = 390;
    const vh = 844;
    const raw = { t: 56, l: 12, w: 366, h: 1600 };
    const clipped = clipSpotlight(raw, 'platform-grid', vw, vh);
    assert.ok(clipped.h <= vh * 0.42 + 0.5);
    assert.ok(!tourIsHuge(clipped, 'platform-grid', false, vw, vh));
    const pos = placeTourCard(clipped, false, 'platform-grid', vw, vh, false);
    onScreen(pos, vw, vh);
  });

  it('rings the visible Add a channel pane on desktop, not a 42vh slice', () => {
    const vw = 1440;
    const vh = 900;
    const raw = { t: 72, l: 276, w: 1100, h: 2200 };
    const clipped = clipSpotlight(raw, 'platform-grid', vw, vh);
    assert.ok(
      clipped.h > vh * 0.42 + 1,
      `desktop must not cap Add a channel to the phone slice (got ${clipped.h})`
    );
    assert.ok(clipped.t + clipped.h <= vh - 7);
    assert.ok(clipped.h >= vh - clipped.t - 16);
    assert.ok(!tourIsHuge(clipped, 'platform-grid', false, vw, vh));
    const pos = placeTourCard(clipped, false, 'platform-grid', vw, vh, false);
    onScreen(pos, vw, vh);
  });

  it('docks the API key card to the bottom so the strip at the top stays visible', () => {
    const vw = 390;
    const vh = 844;
    const strip = { t: 72, l: 16, w: 358, h: 52 };
    assert.ok(!tourIsHuge(strip, 'connect-creds', false, vw, vh));
    const pos = placeTourCard(strip, false, 'connect-creds', vw, vh, false);
    onScreen(pos, vw, vh);
    assert.ok(pos.t > vh * 0.6, 'card should sit in the lower half');
    assert.ok(pos.t >= strip.t + strip.h, 'card should not cover the key strip');
  });

  it('places Connect beside the rail on desktop', () => {
    const vw = 1440;
    const vh = 900;
    const target = { t: 220, l: 16, w: 204, h: 40 };
    const pos = placeTourCard(target, false, 'connect-pq', vw, vh, false);
    onScreen(pos, vw, vh);
    assert.ok(pos.l >= target.l + target.w, 'card should sit to the right of Connect');
  });

  it('places Featured under the row on desktop, not as a full-overlay dim', () => {
    const vw = 1440;
    const vh = 900;
    const raw = { t: 168, l: 280, w: 1040, h: 188 };
    assert.ok(!tourIsHuge(raw, 'connect-featured', false, vw, vh));
    const pos = placeTourCard(raw, false, 'connect-featured', vw, vh, false);
    onScreen(pos, vw, vh);
  });

  it('still fits on a collapsed tablet rail', () => {
    const vw = 1024;
    const vh = 768;
    const target = { t: 200, l: 8, w: 44, h: 44 };
    const pos = placeTourCard(target, false, 'connect-pq', vw, vh, false);
    onScreen(pos, vw, vh);
  });

  it('docks the calendar card on a phone instead of sitting beside the grid', () => {
    const vw = 390;
    const vh = 844;
    const grid = { t: 56, l: 0, w: 390, h: 700 };
    const band = { t: 120, l: 8, w: 374, h: 280 };
    const pos = placeByBand(grid, band, false, vw, vh);
    assert.ok(pos);
    onScreen(pos, vw, vh);
  });

  it('keeps a tall phone card fully on screen so Next is tappable', () => {
    const vw = 390;
    const vh = 844;
    const cardH = 280;
    const target = { t: 96, l: 12, w: 260, h: 44 };
    const pos = placeTourCard(target, false, 'connect-pq', vw, vh, false, cardH);
    onScreen(pos, vw, vh, tourCardWidth(vw), cardH);
    assert.ok(pos.t + cardH <= vh - TOUR_MARGIN + 0.5);
  });

  it('still fits a tall card on a short landscape phone', () => {
    const vw = 844;
    const vh = 390;
    const cardH = 280;
    const pos = placeTourCard(
      { t: 40, l: 16, w: 812, h: 200 },
      false,
      'cal-grid',
      vw,
      vh,
      false,
      cardH
    );
    onScreen(pos, vw, vh, tourCardWidth(vw), cardH);
  });
});
