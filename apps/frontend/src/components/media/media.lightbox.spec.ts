import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('./media.lightbox.tsx', import.meta.url)),
  'utf8',
);

describe('Media lightbox frame', () => {
  it('does not force a 16:10 landscape box', () => {
    assert.doesNotMatch(source, /aspect-\[16\/10\]/);
    assert.match(source, /object-contain/);
  });
});
