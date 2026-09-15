import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('./settings.component.tsx', import.meta.url)),
  'utf8',
);

describe('Settings mobile stack', () => {
  it('does not cap phone nav at 132px', () => {
    assert.doesNotMatch(source, /max-h-\[132px\]/);
  });

  it('uses an index list then a pushed pane on phone', () => {
    assert.match(source, /data-settings-index/);
    assert.match(source, /showIndex/);
    assert.match(source, /closeMobilePane/);
  });
});
