import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('./statistics.tsx', import.meta.url)),
  'utf8',
);

describe('Statistics modal', () => {
  it('uses the same 7d 30d 90d pills as analytics, not a Days dropdown', () => {
    assert.match(source, /range_7d/);
    assert.match(source, /range_30d/);
    assert.match(source, /range_90d/);
    assert.doesNotMatch(source, /from '@gitroom\/react\/form\/select'/);
    assert.doesNotMatch(source, /7 Days/);
  });

  it('plots the returned series and uses the latest point as the card total', () => {
    assert.match(source, /ChartSocial/);
    assert.match(source, /points\[points\.length - 1\]/);
    assert.match(source, /variant="spark"/);
  });

  it('gives the empty short-link state a finished card, not a lone muted line', () => {
    assert.match(source, /no_short_link_results_hint/);
    assert.match(source, /This post has no tracked short links/);
  });
});
