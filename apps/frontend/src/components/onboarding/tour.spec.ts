import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { STEPS, TOUR_COPY } from './tour.steps.ts';

const overlay = readFileSync(
  fileURLToPath(new URL('./tour.tsx', import.meta.url)),
  'utf8',
);
const css = readFileSync(
  fileURLToPath(new URL('../../app/global.css', import.meta.url)),
  'utf8',
);
const chatbase = readFileSync(
  fileURLToPath(new URL('../layout/chatbase.component.tsx', import.meta.url)),
  'utf8',
);

describe('product tour Connect steps', () => {
  it('walks calendar, Connect hub, then publishing channels', () => {
    assert.deepEqual(
      STEPS.map((s) => s.key),
      [
        'cal-grid',
        'posts-panel',
        'connect-pq',
        'connect-creds',
        'connect-featured',
        'nav-channels',
        'platform-grid',
      ]
    );
  });

  it('opens the hub on All for the key strip and Featured, after Connect on the calendar', () => {
    const connect = STEPS.find((s) => s.key === 'connect-pq');
    assert.ok(connect);
    assert.equal(connect.path, '__calendar__');
    for (const key of ['connect-creds', 'connect-featured']) {
      const step = STEPS.find((s) => s.key === key);
      assert.ok(step, key);
      assert.match(step.path, /\/connections\?nav=all/);
    }
  });

  it('has copy for every step, with no dashes, and splits assistant from channel', () => {
    for (const step of STEPS) {
      const copy = TOUR_COPY[step.key];
      assert.ok(copy, `missing TOUR_COPY.${step.key}`);
      assert.doesNotMatch(
        `${copy.title} ${copy.text}`,
        /[—–]| - /,
        `${step.key} copy has a dash`
      );
    }
    assert.match(TOUR_COPY['connect-pq'].text, /Channels/);
    assert.match(TOUR_COPY['connect-pq'].title, /not a channel/i);
    assert.match(TOUR_COPY['connect-featured'].text, /Featured/);
    assert.doesNotMatch(TOUR_COPY['connect-featured'].text, /left rail/);
    assert.match(TOUR_COPY['connect-creds'].text, /API key|MCP URL/i);
    assert.match(TOUR_COPY['nav-channels'].text, /not an assistant/);
    assert.ok(!TOUR_COPY['connections-page']);
    assert.doesNotMatch(
      TOUR_COPY['connect-featured'].text,
      /every other MCP client/
    );
  });

  it('hides Chatbase over the tour and phone sheets, and uses a 44px Next on phones', () => {
    assert.match(overlay, /seenKey/);
    assert.match(overlay, /STORAGE_KEY}:\$\{orgId\}/);
    assert.match(overlay, /if \(!orgId\) return/);
    assert.match(overlay, /isMobileTour\(vw\)/);
    assert.match(overlay, /min-h-\[44px\]/);
    assert.match(overlay, /setInterval\(apply, 100\)/);
    assert.match(css, /\[data-tourdemo='1'\] #chatbase-bubble-button/);
    assert.match(css, /\[data-tourdemo='1'\] iframe\[src\*='chatbase'\]/);
    assert.match(chatbase, /hideChatbaseForChrome/);
    assert.match(chatbase, /setProperty\('display', 'none', 'important'\)/);
    assert.match(chatbase, /data-pq-cbh/);
    assert.match(chatbase, /aria-expanded/);
    assert.match(chatbase, /requestAnimationFrame\(tick\)/);
  });
});
