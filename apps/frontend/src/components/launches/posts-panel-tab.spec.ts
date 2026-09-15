import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  pickPostsPanelTab,
  postsListHasRows,
} from './posts-panel-tab.ts';

const context = readFileSync(
  fileURLToPath(new URL('./calendar.context.tsx', import.meta.url)),
  'utf8',
);

describe('pickPostsPanelTab', () => {
  it('prefers scheduled, then drafts, then posted, else scheduled', () => {
    assert.equal(
      pickPostsPanelTab({
        scheduled: true,
        draft: true,
        published: true,
      }),
      'scheduled',
    );
    assert.equal(
      pickPostsPanelTab({
        scheduled: false,
        draft: true,
        published: true,
      }),
      'draft',
    );
    assert.equal(
      pickPostsPanelTab({
        scheduled: false,
        draft: false,
        published: true,
      }),
      'published',
    );
    assert.equal(
      pickPostsPanelTab({
        scheduled: false,
        draft: false,
        published: false,
      }),
      'scheduled',
    );
  });
});

describe('postsListHasRows', () => {
  it('reads minified list totals so the welcome probe is not always empty', () => {
    assert.equal(postsListHasRows({ t: 4, p: [{ i: '1' }] }), true);
    assert.equal(postsListHasRows({ t: 0, p: [] }), false);
    assert.equal(postsListHasRows({ total: 2, posts: [] }), true);
  });
});

describe('calendar posts panel welcome tab', () => {
  it('picks through postsListHasRows / pickPostsPanelTab, not raw data.total', () => {
    assert.match(context, /pickPostsPanelTab/);
    assert.match(context, /postsListHasRows/);
    assert.doesNotMatch(
      context,
      /return \(data\?\.total \|\| 0\) > 0/,
    );
    assert.match(context, /panelTabResolved/);
  });
});
