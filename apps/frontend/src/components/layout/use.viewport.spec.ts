import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('./use.viewport.tsx', import.meta.url)),
  'utf8',
);

describe('ViewportProvider', () => {
  it('listens for breakpoint changes instead of every resize pixel', () => {
    assert.match(source, /export const measureViewport/);
    assert.match(source, /matchMedia/);
    assert.match(source, /sameBucket/);
    assert.match(source, /splitComposer/);
    assert.match(source, /PQ_COMPOSER_SPLIT_MIN/);
    assert.doesNotMatch(source, /addEventListener\('resize'/);
    assert.doesNotMatch(source, /setWidth\(window\.innerWidth\)/);
  });
});
