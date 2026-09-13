import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { STEPS, TOUR_COPY } from './tour.steps.ts';

describe('product tour Connect steps', () => {
  it('walks calendar, Connect hub, then publishing channels', () => {
    assert.deepEqual(
      STEPS.map((s) => s.key),
      [
        'cal-grid',
        'posts-panel',
        'connect-pq',
        'connect-featured',
        'connect-creds',
        'nav-channels',
        'platform-grid',
      ]
    );
  });

  it('opens Connect on All so Featured and the key strip exist', () => {
    for (const key of ['connect-pq', 'connect-featured', 'connect-creds']) {
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
    assert.match(TOUR_COPY['connect-creds'].text, /API key|MCP URL/i);
    assert.match(TOUR_COPY['nav-channels'].text, /not an assistant/);
    assert.ok(!TOUR_COPY['connections-page']);
    assert.doesNotMatch(
      TOUR_COPY['connect-featured'].text,
      /every other MCP client/
    );
  });
});
