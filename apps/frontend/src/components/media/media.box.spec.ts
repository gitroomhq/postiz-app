import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('./media.box.tsx', import.meta.url)),
  'utf8',
);

describe('Media library thumbnails', () => {
  it('are square tiles, not 4/3 banners', () => {
    assert.match(source, /MEDIA_LIBRARY_THUMB_ASPECT = 'aspect-square'/);
    assert.doesNotMatch(source, /aspect-\[4\/3\]/);
  });
});
